import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hasLocalDb, testCode } from "./db";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath }));
const requireAdmin = vi.fn(async () => ({ id: "admin", name: "Admin", role: "ADMIN" }));
vi.mock("@/lib/auth", () => ({ requireAdmin }));

describe.skipIf(!hasLocalDb)("rifa (base local)", () => {
  const codes = {
    eligible: testCode(),
    notApproved: testCode(),
    notCompleted: testCode(),
    pastWinner: testCode(),
    voided: testCode(),
  };
  const all = Object.values(codes);

  // La rifa sortea entre todo el pool de la base; para aislar la prueba, el
  // resto de los asistentes queda fuera mientras corre y se restaura al final.
  let parked: string[] = [];

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    const others = await prisma.attendee.findMany({
      where: { approved: true, completedAt: { not: null }, raffleWins: { none: {} } },
      select: { id: true },
    });
    parked = others.map((a) => a.id);
    await prisma.attendee.updateMany({ where: { id: { in: parked } }, data: { approved: false } });

    const done = new Date();
    await prisma.attendee.createMany({
      data: [
        { code: codes.eligible, name: "Rifa Elegible", approved: true, completedAt: done },
        { code: codes.notApproved, name: "Rifa No Aprobado", approved: false, completedAt: done },
        { code: codes.notCompleted, name: "Rifa Sin Pasaporte", approved: true },
        { code: codes.pastWinner, name: "Rifa Ya Ganó", approved: true, completedAt: done },
        { code: codes.voided, name: "Rifa Anulado", approved: true, completedAt: done },
      ],
    });
    const past = await prisma.attendee.findUniqueOrThrow({ where: { code: codes.pastWinner } });
    const voided = await prisma.attendee.findUniqueOrThrow({ where: { code: codes.voided } });
    await prisma.raffleWinner.create({ data: { attendeeId: past.id } });
    await prisma.raffleWinner.create({ data: { attendeeId: voided.id, voidedAt: done } });
  });

  beforeEach(async () => {
    const { prisma } = await import("@/lib/db");
    const eligible = await prisma.attendee.findUniqueOrThrow({ where: { code: codes.eligible } });
    await prisma.raffleWinner.deleteMany({ where: { attendeeId: eligible.id } });
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code: { in: all } } });
    await prisma.attendee.updateMany({ where: { id: { in: parked } }, data: { approved: true } });
    await prisma.$disconnect();
  });

  it("el pool solo tiene aprobados con pasaporte completo que no han salido", async () => {
    const { getRaffleState } = await import("@/lib/raffle");
    const state = await getRaffleState();
    expect(state.pool).toBe(1);
    const names = state.winners.map((w) => w.code);
    expect(names).toContain(codes.pastWinner);
    expect(names).toContain(codes.voided);
  });

  it("drawWinner saca al único elegible y luego se queda sin participantes", async () => {
    const { drawWinner } = await import("@/app/actions/raffle");
    revalidatePath.mockClear();
    const first = await drawWinner();
    expect(first).toMatchObject({ ok: true, winner: { code: codes.eligible } });
    // Refrescar aqui pintaria al ganador en la lista antes de la animacion.
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(JSON.stringify(first)).not.toMatch(/"email"|"phone"/);

    const second = await drawWinner();
    expect(second.ok).toBe(false);
  });

  it("anular deja al ganador fuera de futuros sorteos", async () => {
    const { drawWinner, voidWinner } = await import("@/app/actions/raffle");
    const first = await drawWinner();
    if (!first.ok) throw new Error(first.error);
    expect(await voidWinner(first.winner.id)).toEqual({ ok: true });
    expect(await voidWinner(first.winner.id)).toEqual({ ok: false });
    expect((await drawWinner()).ok).toBe(false);
  });

  it("sin rol de administrador no se sortea ni se anula", async () => {
    const { prisma } = await import("@/lib/db");
    const { drawWinner, voidWinner } = await import("@/app/actions/raffle");
    requireAdmin.mockRejectedValueOnce(new Error("Se requiere rol de administrador"));
    await expect(drawWinner()).rejects.toThrow();
    requireAdmin.mockRejectedValueOnce(new Error("Se requiere rol de administrador"));
    await expect(voidWinner("x")).rejects.toThrow();
    const eligible = await prisma.attendee.findUniqueOrThrow({ where: { code: codes.eligible } });
    expect(await prisma.raffleWinner.count({ where: { attendeeId: eligible.id } })).toBe(0);
  });
});
