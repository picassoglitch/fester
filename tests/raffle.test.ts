import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ensureStations, hasLocalDb, testCode } from "./db";
import { emptyPoolMessage, fullPrizeMessage, rafflePrize, RAFFLE_PRIZES, type RafflePrize } from "@/lib/raffle-prizes";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath }));
const requireAdmin = vi.fn(async () => ({ id: "admin", name: "Admin", role: "ADMIN" }));
vi.mock("@/lib/auth", () => ({ requireAdmin }));

const prize = (key: string) => rafflePrize(key)!;

describe("premios de la rifa", () => {
  it("son 8 lugares: 4 por categoría, Kit 02 y Kit 04 con dos", () => {
    const slots = (category: string) =>
      RAFFLE_PRIZES.filter((p) => p.category === category).reduce((n, p) => n + p.slots, 0);
    expect(slots("Aplicador")).toBe(4);
    expect(slots("Profesionista")).toBe(4);
    expect(prize("kit-02").slots).toBe(2);
    expect(prize("kit-04").slots).toBe(2);
    expect(new Set(RAFFLE_PRIZES.map((p) => p.key)).size).toBe(RAFFLE_PRIZES.length);
    expect(RAFFLE_PRIZES.every((p) => p.image === `/rifa/${p.key}.webp`)).toBe(true);
  });

  it("los kits traen foto; ningún premio trae «Sin rotular»", () => {
    const exists = (p: { image: string }) => fs.existsSync(path.join(process.cwd(), "public", p.image));
    for (const key of ["kit-01", "kit-02", "kit-03", "kit-04"]) expect(exists(prize(key))).toBe(true);
    const all: readonly RafflePrize[] = RAFFLE_PRIZES;
    expect(JSON.stringify(all)).not.toMatch(/rotular/i);
  });
});

describe.skipIf(!hasLocalDb)("rifa por premio (base local)", () => {
  const done = new Date();
  const people = {
    apl1: { festerProfile: "Aplicador" },
    apl2: { festerProfile: "DIY" },
    // Sin perfil de Fester: el puesto decide (catálogo, no Arquitecto ni Estudiante = Aplicador).
    apl3: { position: "Contratista" },
    prof1: { festerProfile: "Profesionista" },
    prof2: { festerProfile: "Constructora" },
    prof3: { position: "Arquitecto" },
    student: { festerProfile: "Estudiante" },
    studentByPosition: { position: "Estudiante" },
    noCategory: {},
    door: { festerProfile: "Aplicador", origin: "PUERTA" as const },
    notApproved: { festerProfile: "Aplicador", approved: false },
    notCompleted: { festerProfile: "Profesionista", completedAt: null },
    aplPending: { festerProfile: "Aplicador", completedAt: null },
    aplPending2: { position: "Contratista", completedAt: null },
    studentPending: { festerProfile: "Estudiante", completedAt: null },
    doorPending: { festerProfile: "Profesionista", origin: "PUERTA" as const, completedAt: null },
    notApprovedPending: { festerProfile: "Aplicador", approved: false, completedAt: null },
  };
  type Who = keyof typeof people;
  const codes = Object.fromEntries(Object.keys(people).map((k) => [k, testCode()])) as Record<Who, string>;
  const APLICADORES = [codes.apl1, codes.apl2, codes.apl3];
  const PROFESIONISTAS = [codes.prof1, codes.prof2, codes.prof3];
  const ids: string[] = [];

  // La rifa sortea entre todo el pool de la base; para aislar la prueba, el
  // resto de los asistentes queda fuera mientras corre y se restaura al final.
  let parked: string[] = [];

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    const others = await prisma.attendee.findMany({ where: { approved: true }, select: { id: true } });
    parked = others.map((a) => a.id);
    await prisma.attendee.updateMany({ where: { id: { in: parked } }, data: { approved: false } });

    for (const [who, extra] of Object.entries(people)) {
      const row = await prisma.attendee.create({
        data: { code: codes[who as Who], name: `Rifa ${who}`, approved: true, completedAt: done, ...extra },
      });
      ids.push(row.id);
    }
    // Llegaron sin completar: uno con Entrada, otro con una estrella. aplPending2 no vino.
    await ensureStations();
    const station = await prisma.station.findFirstOrThrow({ where: { active: true } });
    const idOf = async (who: Who) => (await prisma.attendee.findUniqueOrThrow({ where: { code: codes[who] } })).id;
    await prisma.access.create({ data: { attendeeId: await idOf("aplPending"), kind: "ENTRY" } });
    await prisma.scan.create({ data: { attendeeId: await idOf("notCompleted"), stationId: station.id } });
    for (const who of ["studentPending", "doorPending", "notApprovedPending"] as const) {
      await prisma.access.create({ data: { attendeeId: await idOf(who), kind: "ENTRY" } });
    }
  });

  beforeEach(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.raffleWinner.deleteMany({ where: { attendeeId: { in: ids } } });
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { id: { in: ids } } });
    await prisma.attendee.updateMany({ where: { id: { in: parked } }, data: { approved: true } });
    await prisma.$disconnect();
  });

  async function draw(key: string) {
    const { drawWinner } = await import("@/app/actions/raffle");
    return drawWinner(key);
  }

  it("divide el pool por brazalete; fuera estudiantes, puerta, sin categoría, no aprobados y sin pasaporte", async () => {
    const { getRafflePools, getRaffleState } = await import("@/lib/raffle");
    const pools = await getRafflePools();
    expect(pools.Aplicador.map((c) => c.code).sort()).toEqual([...APLICADORES].sort());
    expect(pools.Profesionista.map((c) => c.code).sort()).toEqual([...PROFESIONISTAS].sort());
    const state = await getRaffleState();
    expect(state.pools).toEqual({ Aplicador: 3, Profesionista: 3 });
    expect(state.reels.Aplicador.sort()).toEqual(["Rifa apl1", "Rifa apl2", "Rifa apl3"]);
  });

  it("cada premio sortea solo en su categoría y guarda el premio", async () => {
    const { prisma } = await import("@/lib/db");
    revalidatePath.mockClear();
    const apl = await draw("kit-01");
    const prof = await draw("moto-profesionista");
    if (!apl.ok || !prof.ok) throw new Error("debió sortear");
    expect(APLICADORES).toContain(apl.winner.code);
    expect(PROFESIONISTAS).toContain(prof.winner.code);
    expect(apl.winner.prizeKey).toBe("kit-01");
    expect(await prisma.raffleWinner.findUnique({ where: { id: prof.winner.id } })).toMatchObject({
      prizeKey: "moto-profesionista",
    });
    // Refrescar aqui pintaria al ganador en la lista antes de la animacion.
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(JSON.stringify(apl)).not.toMatch(/"email"|"phone"|festerProfile|position/);
  });

  it("un premio lleno no se vuelve a sortear (Kit 02 tiene dos lugares)", async () => {
    const first = await draw("kit-02");
    const second = await draw("kit-02");
    expect(first.ok && second.ok).toBe(true);
    expect(await draw("kit-02")).toEqual({ ok: false, error: fullPrizeMessage(prize("kit-02")) });
    expect(await draw("kit-01")).toMatchObject({ ok: true });
    expect(await draw("kit-01")).toEqual({ ok: false, error: "Kit 01 · Constructor Premium ya tiene ganador." });
  });

  it("sorteos simultáneos del mismo premio no pasan del cupo", async () => {
    const { prisma } = await import("@/lib/db");
    const results = await Promise.all(Array.from({ length: 6 }, () => draw("kit-04")));
    expect(results.filter((r) => r.ok)).toHaveLength(2);
    for (const r of results.filter((r) => !r.ok)) expect(r).toEqual({ ok: false, error: fullPrizeMessage(prize("kit-04")) });
    expect(await prisma.raffleWinner.count({ where: { prizeKey: "kit-04", voidedAt: null } })).toBe(2);
  });

  it("nadie gana dos veces, aunque se sorteen varios premios a la vez", async () => {
    const { prisma } = await import("@/lib/db");
    const keys = ["kit-03", "kit-04", "kit-04", "moto-profesionista", "kit-03", "moto-profesionista"];
    const results = await Promise.all(keys.map(draw));
    const winners = results.flatMap((r) => (r.ok ? [r.winner.code] : []));
    // Los que no ganaron fallan por premio lleno o sin participantes, nunca por un error generico.
    const expected = new Set(keys.flatMap((k) => [fullPrizeMessage(prize(k)), emptyPoolMessage(prize(k))]));
    for (const r of results) if (!r.ok) expect(expected.has(r.error)).toBe(true);
    // Hay 3 profesionistas: solo 3 premios se entregan y cada uno a alguien distinto.
    expect(winners).toHaveLength(3);
    expect(new Set(winners).size).toBe(3);
    expect(winners.every((c) => PROFESIONISTAS.includes(c))).toBe(true);
    const rows = await prisma.raffleWinner.groupBy({ by: ["prizeKey"], where: { attendeeId: { in: ids } }, _count: { _all: true } });
    for (const row of rows) expect(row._count._all).toBeLessThanOrEqual(prize(row.prizeKey!).slots);
  });

  it("anular libera el lugar del premio, pero el anulado no vuelve a salir", async () => {
    const { voidWinner } = await import("@/app/actions/raffle");
    const { getRafflePools, filledSlots } = await import("@/lib/raffle");
    const first = await draw("kit-01");
    if (!first.ok) throw new Error(first.error);
    expect((await draw("kit-01")).ok).toBe(false);

    expect(await voidWinner(first.winner.id)).toEqual({ ok: true });
    expect(await voidWinner(first.winner.id)).toEqual({ ok: false });
    expect((await filledSlots())["kit-01"]).toBe(0);
    expect((await getRafflePools()).Aplicador.map((c) => c.code)).not.toContain(first.winner.code);

    const again = await draw("kit-01");
    if (!again.ok) throw new Error(again.error);
    expect(again.winner.code).not.toBe(first.winner.code);
  });

  it("sin participantes de la categoría avisa por premio", async () => {
    for (const key of ["kit-01", "kit-02", "kit-02"]) expect((await draw(key)).ok).toBe(true);
    expect(await draw("moto-aplicador")).toEqual({ ok: false, error: emptyPoolMessage(prize("moto-aplicador")) });
    expect(emptyPoolMessage(prize("moto-aplicador"))).toBe(
      "No quedan aplicadores por sortear para Moto · VENTO TERRA DS 170 – 2026.",
    );
    // Los profesionistas siguen intactos.
    expect(await draw("moto-profesionista")).toMatchObject({ ok: true });
  });

  it("un ganador de antes de los premios (sin premio) no ocupa lugar y sale en la lista", async () => {
    const { prisma } = await import("@/lib/db");
    const { getRaffleState } = await import("@/lib/raffle");
    const legacy = await prisma.attendee.findUniqueOrThrow({ where: { code: codes.apl1 } });
    await prisma.raffleWinner.create({ data: { attendeeId: legacy.id } });
    const state = await getRaffleState();
    expect(Object.values(state.filled).every((n) => n === 0)).toBe(true);
    expect(state.pools.Aplicador).toBe(2);
    expect(state.winners.find((w) => w.code === codes.apl1)).toMatchObject({ prizeKey: null, voidedAt: null });
    // El ganador anterior no ocupa lugar del Kit 01, pero tampoco vuelve a salir.
    expect(await draw("kit-01")).toMatchObject({ ok: true });
    expect(await draw("kit-02")).toMatchObject({ ok: true });
    expect(await draw("kit-02")).toEqual({ ok: false, error: emptyPoolMessage(prize("kit-02")) });
  });

  it("con pool grande, 10 sorteos simultáneos de un premio de un lugar dan un solo ganador", async () => {
    const { prisma } = await import("@/lib/db");
    const extra = Array.from({ length: 15 }, (_, i) => ({
      code: testCode(),
      name: `Rifa extra ${i}`,
      approved: true,
      completedAt: done,
      festerProfile: "Profesionista",
    }));
    await prisma.attendee.createMany({ data: extra });
    const created = await prisma.attendee.findMany({ where: { code: { in: extra.map((e) => e.code) } } });
    ids.push(...created.map((a) => a.id));
    try {
      const results = await Promise.all(Array.from({ length: 10 }, () => draw("moto-profesionista")));
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      for (const r of results.filter((r) => !r.ok)) {
        expect(r).toEqual({ ok: false, error: fullPrizeMessage(prize("moto-profesionista")) });
      }
      expect(await prisma.raffleWinner.count({ where: { prizeKey: "moto-profesionista", voidedAt: null } })).toBe(1);
    } finally {
      await prisma.attendee.deleteMany({ where: { id: { in: created.map((a) => a.id) } } });
    }
  });

  it("premio desconocido no sortea", async () => {
    const { prisma } = await import("@/lib/db");
    expect(await draw("moto-estudiante")).toEqual({ ok: false, error: "Elige un premio para sortear." });
    expect(await prisma.raffleWinner.count({ where: { attendeeId: { in: ids } } })).toBe(0);
  });

  it("sin rol de administrador no se sortea ni se anula", async () => {
    const { prisma } = await import("@/lib/db");
    const { drawWinner, voidWinner } = await import("@/app/actions/raffle");
    requireAdmin.mockRejectedValueOnce(new Error("Se requiere rol de administrador"));
    await expect(drawWinner("kit-01")).rejects.toThrow();
    requireAdmin.mockRejectedValueOnce(new Error("Se requiere rol de administrador"));
    await expect(voidWinner("x")).rejects.toThrow();
    expect(await prisma.raffleWinner.count({ where: { attendeeId: { in: ids } } })).toBe(0);
  });

  it("los conteos de la pantalla son el pool del sorteo; pendientes = mismo filtro sin pasaporte", async () => {
    const { getRafflePools, getRaffleState } = await import("@/lib/raffle");
    const state = await getRaffleState();
    const pools = await getRafflePools();
    expect(state.pools).toEqual({ Aplicador: pools.Aplicador.length, Profesionista: pools.Profesionista.length });
    expect(state.pools).toEqual({ Aplicador: 3, Profesionista: 3 });
    // Solo quien llegó (Entrada o estrella); fuera estudiante, puerta, no aprobado y aplPending2 (no vino).
    expect(state.pending).toEqual({ Aplicador: 1, Profesionista: 1 });
    // Tras un sorteo el conteo baja con el pool.
    expect((await draw("kit-01")).ok).toBe(true);
    expect((await getRaffleState()).pools).toEqual({ Aplicador: 2, Profesionista: 3 });
  });

  it("reiniciar borra todos los ganadores (anulados incluidos) y nada más", async () => {
    const { prisma } = await import("@/lib/db");
    const { resetRaffle, voidWinner } = await import("@/app/actions/raffle");
    const { getRaffleState } = await import("@/lib/raffle");
    const a = await draw("kit-01");
    const b = await draw("kit-03");
    if (!a.ok || !b.ok) throw new Error("debió sortear");
    await voidWinner(a.winner.id);
    const station = await prisma.station.create({ data: { name: "Rifa reinicio" } });
    await prisma.scan.create({ data: { attendeeId: ids[0], stationId: station.id } });
    await prisma.access.create({ data: { attendeeId: ids[0], kind: "ENTRY" } });
    const before = {
      attendees: await prisma.attendee.findMany({ orderBy: { id: "asc" } }),
      scans: await prisma.scan.count(),
      stations: await prisma.station.count(),
      accesses: await prisma.access.count(),
    };
    expect(before.scans).toBeGreaterThan(0);
    expect(await prisma.raffleWinner.count()).toBe(2);
    revalidatePath.mockClear();

    expect(await resetRaffle()).toEqual({ deleted: 2 });
    expect(await prisma.raffleWinner.count()).toBe(0);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/rifa");
    expect(await prisma.attendee.findMany({ orderBy: { id: "asc" } })).toEqual(before.attendees);
    expect(await prisma.scan.count()).toBe(before.scans);
    expect(await prisma.station.count()).toBe(before.stations);
    expect(await prisma.access.count()).toBe(before.accesses);
    // El anulado vuelve a participar y todos los lugares quedan libres.
    const state = await getRaffleState();
    expect(state.pools).toEqual({ Aplicador: 3, Profesionista: 3 });
    expect(Object.values(state.filled).every((n) => n === 0)).toBe(true);
    expect(await resetRaffle()).toEqual({ deleted: 0 });
    await prisma.station.delete({ where: { id: station.id } });
  });

  it("después de reiniciar se sortea normal, hasta llenar cada premio", async () => {
    const { resetRaffle } = await import("@/app/actions/raffle");
    for (const key of ["kit-01", "kit-02", "kit-02"]) expect((await draw(key)).ok).toBe(true);
    await resetRaffle();
    const winners = [];
    for (const key of ["kit-01", "kit-02", "kit-02"]) {
      const r = await draw(key);
      if (!r.ok) throw new Error(r.error);
      winners.push(r.winner.code);
    }
    expect(new Set(winners).size).toBe(3);
    expect(await draw("kit-01")).toEqual({ ok: false, error: fullPrizeMessage(prize("kit-01")) });
  });

  it("un reinicio simultáneo con sorteos no deja lugares de más", async () => {
    const { prisma } = await import("@/lib/db");
    const { resetRaffle } = await import("@/app/actions/raffle");
    await Promise.all([draw("kit-04"), resetRaffle(), draw("kit-04"), draw("kit-04")]);
    expect(await prisma.raffleWinner.count({ where: { prizeKey: "kit-04", voidedAt: null } })).toBeLessThanOrEqual(2);
  });

  it("sin rol de administrador no se reinicia", async () => {
    const { prisma } = await import("@/lib/db");
    const { resetRaffle } = await import("@/app/actions/raffle");
    expect((await draw("kit-01")).ok).toBe(true);
    requireAdmin.mockRejectedValueOnce(new Error("Se requiere rol de administrador"));
    await expect(resetRaffle()).rejects.toThrow("Se requiere rol de administrador");
    expect(await prisma.raffleWinner.count()).toBe(1);
  });
});
