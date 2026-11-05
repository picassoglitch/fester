import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureStations, hasLocalDb, testCode } from "./db";

describe.skipIf(!hasLocalDb)("panel en vivo: cuenta a los que llegaron (base local)", () => {
  const codes = { entry: testCode(), scan: testCode(), never: testCode() };
  let before: { attendees: number; arrived: number } = { attendees: 0, arrived: 0 };

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    const { getDashboardStats } = await import("@/lib/stats");
    await ensureStations();
    before = (await getDashboardStats()).totals;
    const station = await prisma.station.findFirstOrThrow({ where: { active: true, name: { notIn: ["Registro", "Salida"] } } });
    const entry = await prisma.attendee.create({ data: { code: codes.entry, name: "Panel Entrada" } });
    const scan = await prisma.attendee.create({ data: { code: codes.scan, name: "Panel Estrella" } });
    await prisma.attendee.create({ data: { code: codes.never, name: "Panel No Vino" } });
    await prisma.access.create({ data: { attendeeId: entry.id, kind: "ENTRY" } });
    await prisma.scan.create({ data: { attendeeId: scan.id, stationId: station.id } });
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code: { in: Object.values(codes) } } });
    await prisma.$disconnect();
  });

  it("Registrados cuenta a todos; Llegaron solo a quien tiene Entrada o estrella", async () => {
    const { getDashboardStats } = await import("@/lib/stats");
    const { totals } = await getDashboardStats();
    expect(totals.attendees - before.attendees).toBe(3);
    expect(totals.arrived - before.arrived).toBe(2);
  });

  it("estrellas promedio y avance se dividen entre los que llegaron", async () => {
    const { getDashboardStats } = await import("@/lib/stats");
    const { totals, distribution } = await getDashboardStats();
    expect(totals.avgStars).toBeCloseTo(totals.scans / totals.arrived);
    expect(totals.progressRate).toBeCloseTo(totals.scans / (totals.arrived * totals.stations));
    // La distribución de estrellas tampoco incluye a quien no vino.
    expect(distribution.reduce((a, b) => a + b, 0)).toBe(totals.arrived);
  });

  it("tiempo mediano: desde la Entrada, no desde el registro web", async () => {
    const { prisma } = await import("@/lib/db");
    const { getDashboardStats } = await import("@/lib/stats");
    // Aísla: solo este pase completo mientras corre.
    const others = await prisma.attendee.findMany({ where: { completedAt: { not: null } }, select: { id: true, completedAt: true } });
    await prisma.attendee.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { completedAt: null } });
    const a = await prisma.attendee.findUniqueOrThrow({ where: { code: codes.entry } });
    const entryAt = new Date("2026-11-05T16:00:00Z");
    await prisma.attendee.update({ where: { id: a.id }, data: { createdAt: new Date("2026-10-01T00:00:00Z"), completedAt: new Date("2026-11-05T16:45:00Z") } });
    await prisma.access.updateMany({ where: { attendeeId: a.id }, data: { createdAt: entryAt } });
    try {
      expect((await getDashboardStats()).totals.medianCompletionMs).toBe(45 * 60 * 1000);
    } finally {
      for (const o of others) await prisma.attendee.update({ where: { id: o.id }, data: { completedAt: o.completedAt } });
    }
  });
});
