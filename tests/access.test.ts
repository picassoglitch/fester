import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hasLocalDb, testCode } from "./db";
import { CAPACITY, checkEntry } from "@/lib/access";
import { doorKindOf } from "@/lib/stations";

const session: { id: string; name: string; role: "STAFF" | "PRIZES" | "ADMIN" } = {
  id: "",
  name: "Puerta Pruebas",
  role: "STAFF",
};
vi.mock("@/lib/auth", () => ({ requireSession: vi.fn(async () => session) }));

describe("checkEntry", () => {
  const base = { inside: false, insideCount: 0, override: false };
  it("con lugar entra", () => expect(checkEntry(base)).toEqual({ action: "enter" }));
  it("quien ya está dentro no cuenta doble", () =>
    expect(checkEntry({ ...base, inside: true, override: true })).toEqual({ action: "already" }));
  it("foro lleno pide confirmar y con override entra", () => {
    expect(checkEntry({ ...base, insideCount: CAPACITY - 1 })).toEqual({ action: "enter" });
    expect(checkEntry({ ...base, insideCount: CAPACITY })).toEqual({ action: "confirm", reasons: ["aforo-lleno"] });
    expect(checkEntry({ ...base, insideCount: CAPACITY, override: true })).toEqual({ action: "enter" });
  });
});

describe("doorKindOf", () => {
  it("Registro es entrada y Salida es salida, sin importar mayúsculas, acentos o espacios", () => {
    expect(doorKindOf("Registro")).toBe("ENTRY");
    expect(doorKindOf(" REGISTRO ")).toBe("ENTRY");
    expect(doorKindOf("Salida")).toBe("EXIT");
    expect(doorKindOf("salída")).toBe("EXIT");
    expect(doorKindOf("Photo Opp")).toBeNull();
    expect(doorKindOf("Registro VIP")).toBeNull();
  });
});

describe.skipIf(!hasLocalDb)("Registro y Salida en el escáner (base local)", () => {
  const ok = testCode();
  const no = testCode();
  const created: string[] = [];
  let registro = "";
  let salida = "";

  async function stationNamed(name: string) {
    const { prisma } = await import("@/lib/db");
    const found = await prisma.station.findFirst({ where: { name, active: true } });
    if (found) return found.id;
    const station = await prisma.station.create({ data: { name, order: 999 } });
    created.push(station.id);
    return station.id;
  }

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    registro = await stationNamed("Registro");
    salida = await stationNamed("Salida");
    const staff = await prisma.staff.create({ data: { name: "Puerta Pruebas", pinHash: "x" } });
    session.id = staff.id;
    await prisma.attendee.createMany({
      data: [
        { code: ok, name: "Puerta Aprobado", approved: true },
        { code: no, name: "Puerta No Aprobado", approved: false },
      ],
    });
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code: { in: [ok, no] } } });
    await prisma.station.deleteMany({ where: { id: { in: created } } });
    await prisma.staff.delete({ where: { id: session.id } });
    await prisma.$disconnect();
  });

  it("Registro da estrella y entrada; repetir no cuenta doble; Salida descuenta sin estrella; reingreso cuenta", async () => {
    const { prisma } = await import("@/lib/db");
    const { recordScan } = await import("@/app/actions/scan");
    const inside = () => prisma.attendee.count({ where: { insideAt: { not: null } } });
    const before = await inside();

    expect(await recordScan(ok, registro)).toMatchObject({ ok: true, status: "nuevo", inside: before + 1 });
    expect(await recordScan(ok, registro)).toMatchObject({ ok: true, status: "repetido", inside: before + 1 });
    expect(await recordScan(ok, salida)).toMatchObject({ ok: true, status: "salida", inside: before });
    expect(await recordScan(ok, salida)).toMatchObject({ ok: true, status: "ya-afuera", inside: before });
    expect(await recordScan(ok, registro)).toMatchObject({ ok: true, status: "entrada", inside: before + 1 });

    const a = await prisma.attendee.findUniqueOrThrow({ where: { code: ok } });
    expect(await prisma.scan.count({ where: { attendeeId: a.id, stationId: registro } })).toBe(1);
    expect(await prisma.scan.count({ where: { attendeeId: a.id, stationId: salida } })).toBe(0);
    expect(await prisma.access.count({ where: { attendeeId: a.id } })).toBe(3);
  });

  it("Salida no es estrella: el pasaporte no la pide y no aparece en el avance", async () => {
    const { getActiveStations } = await import("@/lib/stations");
    const { getStaffAttendeeProgress } = await import("@/lib/attendee");
    const passport = await getActiveStations();
    expect(passport.map((s) => s.id)).toContain(registro);
    expect(passport.map((s) => s.id)).not.toContain(salida);
    const progress = await getStaffAttendeeProgress(ok);
    expect(progress?.total).toBe(passport.length);
  });

  it("completar todas las estaciones menos Salida completa el pasaporte (rifa)", async () => {
    const { prisma } = await import("@/lib/db");
    const { getActiveStations, markCompletedAttendees } = await import("@/lib/stations");
    const { syncCompletion } = await import("@/lib/attendee");
    const a = await prisma.attendee.findUniqueOrThrow({ where: { code: ok } });
    const passport = await getActiveStations();
    await prisma.scan.createMany({
      data: passport.map((s) => ({ attendeeId: a.id, stationId: s.id })),
      skipDuplicates: true,
    });
    expect(await syncCompletion(a.id)).not.toBeNull();
    await prisma.attendee.update({ where: { id: a.id }, data: { completedAt: null } });
    await markCompletedAttendees();
    expect((await prisma.attendee.findUniqueOrThrow({ where: { id: a.id } })).completedAt).not.toBeNull();
  });

  it("no aprobado en Registro entra directo: la lista solo filtra la rifa", async () => {
    const { prisma } = await import("@/lib/db");
    const { recordScan } = await import("@/app/actions/scan");
    const first = await recordScan(no, registro);
    expect(first).toMatchObject({ ok: true, status: "nuevo" });
    const a = await prisma.attendee.findUniqueOrThrow({ where: { code: no } });
    expect(a.insideAt).not.toBeNull();
    expect(await prisma.scan.count({ where: { attendeeId: a.id, stationId: registro } })).toBe(1);
    const log = await prisma.access.findFirstOrThrow({ where: { attendeeId: a.id } });
    expect(log).toMatchObject({ kind: "ENTRY", override: false, staffId: session.id });
    expect(JSON.stringify(first)).not.toMatch(/"email"|"phone"/);
    await recordScan(no, salida);
  });

  it("foro lleno: aun aprobado pide confirmar y con Dejar pasar queda marcado", async () => {
    const { prisma } = await import("@/lib/db");
    const { recordScan } = await import("@/app/actions/scan");
    const a = await prisma.attendee.findUniqueOrThrow({ where: { code: ok } });
    await recordScan(ok, salida);
    const already = await prisma.attendee.count({ where: { insideAt: { not: null } } });
    const filler = Array.from({ length: Math.max(0, CAPACITY - already) }, () => testCode());
    await prisma.attendee.createMany({ data: filler.map((code) => ({ code, name: "Relleno", insideAt: new Date() })) });
    try {
      expect(await recordScan(ok, registro)).toMatchObject({ status: "confirmar", reasons: ["aforo-lleno"] });
      expect(await recordScan(ok, registro, true)).toMatchObject({ status: "entrada" });
      const last = await prisma.access.findFirstOrThrow({
        where: { attendeeId: a.id, kind: "ENTRY" },
        orderBy: { createdAt: "desc" },
      });
      expect(last.override).toBe(true);
    } finally {
      await prisma.attendee.deleteMany({ where: { code: { in: filler } } });
    }
  });

  it("estaciones normales no tocan el aforo", async () => {
    const { prisma } = await import("@/lib/db");
    const { recordScan } = await import("@/app/actions/scan");
    const other = await prisma.station.create({ data: { name: `Kiosko ${ok}` } });
    created.push(other.id);
    const result = await recordScan(no, other.id);
    expect(result).toMatchObject({ ok: true, status: "nuevo" });
    expect(result.ok && result.inside).toBeUndefined();
  });
});
