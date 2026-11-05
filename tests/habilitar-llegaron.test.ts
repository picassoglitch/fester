import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ensureStations, hasLocalDb, testCode } from "./db";

const requireAdmin = vi.fn(async () => ({ id: "", name: "Admin", role: "ADMIN" as const }));
vi.mock("@/lib/auth", () => ({ requireAdmin, requireSession: requireAdmin }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe.skipIf(!hasLocalDb)("habilitar a todos los que llegaron sin completar (base local)", () => {
  const people = {
    arrivedEntry: { festerProfile: "Aplicador" },
    arrivedScan: { festerProfile: "Profesionista" },
    notArrived: { festerProfile: "Aplicador" },
    notApproved: { festerProfile: "Aplicador", approved: false },
    door: { festerProfile: "Aplicador", origin: "PUERTA" as const },
    student: { festerProfile: "Estudiante" },
  };
  type Who = keyof typeof people;
  const codes = Object.fromEntries(Object.keys(people).map((k) => [k, testCode()])) as Record<Who, string>;
  let parked: string[] = [];

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    // Aislar: el resto de los aprobados queda fuera mientras corre.
    parked = (await prisma.attendee.findMany({ where: { approved: true }, select: { id: true } })).map((a) => a.id);
    await prisma.attendee.updateMany({ where: { id: { in: parked } }, data: { approved: false } });
    await ensureStations();
    const station = await prisma.station.findFirstOrThrow({ where: { active: true } });
    for (const [who, extra] of Object.entries(people)) {
      const a = await prisma.attendee.create({ data: { code: codes[who as Who], name: `Hab ${who}`, approved: true, ...extra } });
      if (who === "arrivedScan") await prisma.scan.create({ data: { attendeeId: a.id, stationId: station.id } });
      else if (who !== "notArrived") await prisma.access.create({ data: { attendeeId: a.id, kind: "ENTRY" } });
    }
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code: { in: Object.values(codes) } } });
    await prisma.attendee.updateMany({ where: { id: { in: parked } }, data: { approved: true } });
    await prisma.$disconnect();
  });

  it("sin admin no habilita a nadie", async () => {
    const { prisma } = await import("@/lib/db");
    const { enableArrived } = await import("@/app/actions/raffle");
    requireAdmin.mockRejectedValueOnce(new Error("Se requiere rol de administrador"));
    await expect(enableArrived()).rejects.toThrow();
    expect(await prisma.attendee.count({ where: { code: { in: Object.values(codes) }, completedAt: { not: null } } })).toBe(0);
  });

  it("habilita exactamente a los que cuenta la pantalla y entran al pool", async () => {
    const { prisma } = await import("@/lib/db");
    const { enableArrived } = await import("@/app/actions/raffle");
    const { getRaffleState, getRafflePools } = await import("@/lib/raffle");
    expect((await getRaffleState()).pending).toEqual({ Aplicador: 1, Profesionista: 1 });

    expect(await enableArrived()).toEqual({ enabled: 2 });

    const done = await prisma.attendee.findMany({
      where: { code: { in: Object.values(codes) }, completedAt: { not: null } },
      select: { code: true },
    });
    expect(done.map((d) => d.code).sort()).toEqual([codes.arrivedEntry, codes.arrivedScan].sort());
    const pools = await getRafflePools();
    expect(pools.Aplicador.map((c) => c.code)).toEqual([codes.arrivedEntry]);
    expect(pools.Profesionista.map((c) => c.code)).toEqual([codes.arrivedScan]);
    expect((await getRaffleState()).pending).toEqual({ Aplicador: 0, Profesionista: 0 });
    // Segunda vez: no hay a quién.
    expect(await enableArrived()).toEqual({ enabled: 0 });
  });
});
