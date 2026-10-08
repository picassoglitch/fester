import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ensureStations, hasLocalDb, testCode } from "./db";

const session = { id: "", name: "Admin Pruebas", role: "ADMIN" as const };
vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(async () => session),
  requireSession: vi.fn(async () => session),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe.skipIf(!hasLocalDb)("estaciones: una sola fuente y completo para siempre (base local)", () => {
  const suffix = Math.random().toString(36).slice(2, 8);
  const codes = { done: testCode(), almost: testCode(), prize: testCode() };
  const ids = { done: "", almost: "", prize: "" };
  const createdStations: string[] = [];
  let extraStationId = "";

  async function attendee(key: keyof typeof ids) {
    const { prisma } = await import("@/lib/db");
    return prisma.attendee.findUniqueOrThrow({ where: { id: ids[key] } });
  }

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    const { getActiveStations } = await import("@/lib/stations");
    const { syncCompletion } = await import("@/lib/attendee");
    await ensureStations();
    const staff = await prisma.staff.create({
      data: { name: "Admin Pruebas", pinHash: "x", role: "ADMIN" },
    });
    session.id = staff.id;

    // Estacion propia de la prueba: a "almost" solo le falta esta.
    const extra = await prisma.station.create({
      data: { name: `Prueba Extra ${suffix}`, order: 900, active: true },
    });
    extraStationId = extra.id;
    createdStations.push(extra.id);

    const stations = await getActiveStations();
    for (const key of ["done", "almost", "prize"] as const) {
      const created = await prisma.attendee.create({ data: { code: codes[key], name: `Prueba ${key}` } });
      ids[key] = created.id;
      const toScan = key === "almost" ? stations.filter((s) => s.id !== extra.id) : stations;
      await prisma.scan.createMany({
        data: toScan.map((s) => ({ attendeeId: created.id, stationId: s.id, staffId: staff.id })),
      });
      await syncCompletion(created.id);
    }
    await prisma.attendee.update({
      where: { id: ids.prize },
      data: { redeemedAt: new Date(), redeemedById: staff.id },
    });
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code: { in: Object.values(codes) } } });
    await prisma.station.deleteMany({ where: { id: { in: createdStations } } });
    await prisma.staff.deleteMany({ where: { id: session.id } });
    await prisma.$disconnect();
  });

  it("parte del estado esperado: dos completos y uno a una estación", async () => {
    expect((await attendee("done")).completedAt).not.toBeNull();
    expect((await attendee("prize")).completedAt).not.toBeNull();
    expect((await attendee("almost")).completedAt).toBeNull();
  });

  it("agregar una estación no reabre a quien ya completó", async () => {
    const { prisma } = await import("@/lib/db");
    const { createStation } = await import("@/app/actions/admin");
    const { syncCompletion, getAttendeeProgress } = await import("@/lib/attendee");
    const before = await attendee("done");

    const name = `Prueba Nueva ${suffix}`;
    expect(await createStation({}, form({ name, emoji: "⭐" }))).toMatchObject({ ok: expect.any(String) });
    const created = await prisma.station.findFirstOrThrow({ where: { name } });
    createdStations.push(created.id);

    // Un escaneo cualquiera vuelve a pasar por syncCompletion.
    expect(await syncCompletion(ids.done)).toEqual(before.completedAt);
    const after = await attendee("done");
    expect(after.completedAt).toEqual(before.completedAt);

    const progress = await getAttendeeProgress(codes.done);
    expect(progress?.completedAt).toBe(before.completedAt?.toISOString());
    expect(progress?.pending).toBe(1);

    const prize = await attendee("prize");
    expect(prize.completedAt).not.toBeNull();
    expect(prize.redeemedAt).not.toBeNull();
    expect(prize.redeemedById).toBe(session.id);
  });

  it("reactivar una estación tampoco reabre ni toca el premio", async () => {
    const { toggleStation } = await import("@/app/actions/admin");
    const name = `Prueba Nueva ${suffix}`;
    const { prisma } = await import("@/lib/db");
    const station = await prisma.station.findFirstOrThrow({ where: { name } });
    const before = await attendee("prize");

    await toggleStation(form({ id: station.id, active: "0", confirm: "1" }));
    expect((await prisma.station.findUniqueOrThrow({ where: { id: station.id } })).active).toBe(false);
    await toggleStation(form({ id: station.id, active: "1", confirm: "1" }));
    expect((await prisma.station.findUniqueOrThrow({ where: { id: station.id } })).active).toBe(true);

    const after = await attendee("prize");
    expect(after.completedAt).toEqual(before.completedAt);
    expect(after.redeemedAt).toEqual(before.redeemedAt);
    expect(after.redeemedById).toBe(before.redeemedById);
    expect((await attendee("done")).completedAt).not.toBeNull();
  });

  it("sin confirmación no cambia la estación", async () => {
    const { prisma } = await import("@/lib/db");
    const { toggleStation, deleteStation } = await import("@/app/actions/admin");
    await toggleStation(form({ id: extraStationId, active: "0" }));
    await deleteStation(form({ id: extraStationId }));
    const station = await prisma.station.findUnique({ where: { id: extraStationId } });
    expect(station?.active).toBe(true);
  });

  it("desactivar marca completos en bloque a quien ya tiene todas las demás", async () => {
    const { prisma } = await import("@/lib/db");
    const { toggleStation } = await import("@/app/actions/admin");
    const { getStationChangeImpact } = await import("@/lib/stations");
    // La estacion nueva de la prueba anterior tambien le falta a "almost": se quita primero.
    const nueva = await prisma.station.findFirstOrThrow({ where: { name: `Prueba Nueva ${suffix}` } });
    await toggleStation(form({ id: nueva.id, active: "0", confirm: "1" }));

    const impact = await getStationChangeImpact();
    expect(impact.completesWithout[extraStationId]).toBeGreaterThanOrEqual(1);
    expect(impact.completed).toBeGreaterThanOrEqual(2);
    expect(impact.redeemed).toBeGreaterThanOrEqual(1);

    // Su ultimo escaneo en una estacion activa tiene fecha conocida; uno posterior
    // en la estacion ya desactivada no debe contar.
    const lastActive = new Date("2026-11-05T17:30:00.000Z");
    const scan = await prisma.scan.findFirstOrThrow({ where: { attendeeId: ids.almost } });
    await prisma.scan.update({ where: { id: scan.id }, data: { createdAt: lastActive } });
    await prisma.scan.updateMany({
      where: { attendeeId: ids.almost, id: { not: scan.id } },
      data: { createdAt: new Date("2026-11-05T15:00:00.000Z") },
    });
    await prisma.scan.create({
      data: { attendeeId: ids.almost, stationId: nueva.id, createdAt: new Date("2026-11-05T19:00:00.000Z") },
    });

    const doneBefore = await attendee("done");
    const almostBefore = await attendee("almost");
    await toggleStation(form({ id: extraStationId, active: "0", confirm: "1" }));

    // Completa con la fecha de su ultimo escaneo activo, no la de ahora.
    const almost = await attendee("almost");
    expect(almost.completedAt).toEqual(lastActive);
    expect(almost.redeemedAt).toEqual(almostBefore.redeemedAt);
    expect(almost.redeemedById).toEqual(almostBefore.redeemedById);
    // A quien ya estaba completo no se le cambia la fecha.
    expect((await attendee("done")).completedAt).toEqual(doneBefore.completedAt);

    // Reactivarla no reabre a "almost" aunque no la tenga.
    await toggleStation(form({ id: extraStationId, active: "1", confirm: "1" }));
    expect((await attendee("almost")).completedAt).not.toBeNull();
  });

  it("no deja borrar una estación con escaneos; sin escaneos sí", async () => {
    const { deleteStation } = await import("@/app/actions/admin");
    const { prisma } = await import("@/lib/db");
    const used = await prisma.station.create({ data: { name: `Prueba Usada ${suffix}`, order: 901 } });
    const empty = await prisma.station.create({ data: { name: `Prueba Vacia ${suffix}`, order: 902 } });
    createdStations.push(used.id, empty.id);
    await prisma.scan.create({ data: { attendeeId: ids.done, stationId: used.id } });

    const refused = await deleteStation(form({ id: used.id, confirm: "1" }));
    expect(refused.error).toMatch(/Desactívala/);
    expect(await prisma.station.findUnique({ where: { id: used.id } })).not.toBeNull();
    expect(await prisma.scan.count({ where: { stationId: used.id } })).toBe(1);

    const deleted = await deleteStation(form({ id: empty.id, confirm: "1" }));
    expect(deleted.error).toBeUndefined();
    expect(await prisma.station.findUnique({ where: { id: empty.id } })).toBeNull();
    // Borrar la vacia (activa) no reabre a nadie ni toca el premio.
    expect((await attendee("done")).completedAt).not.toBeNull();
    expect((await attendee("prize")).redeemedAt).not.toBeNull();

    // Se deja inactiva para no estorbar a las demas pruebas.
    await prisma.station.update({ where: { id: used.id }, data: { active: false } });
  });

  it("revertir un escaneo sí reabre el pase y avisa al admin; el premio no se toca", async () => {
    const { prisma } = await import("@/lib/db");
    const { undoScan } = await import("@/app/actions/admin");
    const scan = await prisma.scan.findFirstOrThrow({ where: { attendeeId: ids.prize } });

    await expect(undoScan(form({ scanId: scan.id, code: codes.prize }))).rejects.toThrow(
      `REDIRECT /admin/asistentes/${codes.prize}?aviso=reabierto`,
    );
    const after = await attendee("prize");
    expect(after.completedAt).toBeNull();
    expect(after.redeemedAt).not.toBeNull();
    expect(after.redeemedById).toBe(session.id);
  });

  it("ensureDefaultStations (npm run db:stations) no desactiva ni mueve las del admin", async () => {
    const { prisma } = await import("@/lib/db");
    const { ensureDefaultStations, DEFAULT_STATIONS } = await import("@/lib/stations");
    const admin = await prisma.station.create({
      data: { name: `Photo Opp ${suffix}`, order: 3, active: true },
    });
    createdStations.push(admin.id);
    const before = await prisma.station.findMany({ orderBy: { id: "asc" } });

    await ensureDefaultStations();
    await ensureDefaultStations();

    const after = await prisma.station.findMany({ orderBy: { id: "asc" } });
    const created = after.filter((s) => !before.some((b) => b.id === s.id));
    createdStations.push(...created.map((s) => s.id));
    // Ninguna existente cambio (activa, orden, nombre, emoji).
    for (const station of before) {
      expect(after.find((s) => s.id === station.id)).toEqual(station);
    }
    for (const { name } of DEFAULT_STATIONS) {
      expect(after.filter((s) => s.name.toLowerCase() === name.toLowerCase())).toHaveLength(1);
    }
  });
});
