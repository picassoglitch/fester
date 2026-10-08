import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ensureStations, hasLocalDb, testCode } from "./db";

const session: { id: string; name: string; role: "STAFF" | "PRIZES" | "ADMIN" } = {
  id: "",
  name: "Staff Pruebas",
  role: "STAFF",
};
vi.mock("@/lib/auth", () => ({ requireSession: vi.fn(async () => session) }));

describe.skipIf(!hasLocalDb)("acciones de escaneo (base local)", () => {
  let code = "";
  let doneCode = "";

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    await ensureStations();
    const staff = await prisma.staff.create({ data: { name: "Staff Pruebas", pinHash: "x" } });
    session.id = staff.id;
    code = testCode();
    doneCode = testCode();
    await prisma.attendee.create({ data: { code, name: "Escaneo Prueba" } });
    await prisma.attendee.create({ data: { code: doneCode, name: "Premio Prueba", completedAt: new Date() } });
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code: { in: [code, doneCode] } } });
    await prisma.staff.delete({ where: { id: session.id } });
    await prisma.$disconnect();
  });

  it("recordScan dos veces en la misma estación deja un solo Scan y 'repetido'", async () => {
    const { prisma } = await import("@/lib/db");
    const { recordScan } = await import("@/app/actions/scan");
    const station = await prisma.station.findFirstOrThrow({ where: { active: true } });

    const first = await recordScan(code, station.id);
    const second = await recordScan(code, station.id);
    expect(first).toMatchObject({ ok: true, status: "nuevo" });
    expect(second).toMatchObject({ ok: true, status: "repetido" });
    const attendee = await prisma.attendee.findUniqueOrThrow({ where: { code } });
    expect(await prisma.scan.count({ where: { attendeeId: attendee.id } })).toBe(1);
    expect(JSON.stringify(first)).not.toMatch(/"email"|"phone"/);
  });

  it("Premios no registra estaciones ni consulta pases para estaciones", async () => {
    const { prisma } = await import("@/lib/db");
    const { lookupAttendee, recordScan } = await import("@/app/actions/scan");
    const station = await prisma.station.findFirstOrThrow({ where: { active: true } });
    const attendee = await prisma.attendee.findUniqueOrThrow({ where: { code } });
    const before = await prisma.scan.count({ where: { attendeeId: attendee.id } });

    session.role = "PRIZES";
    try {
      const error = { ok: false, error: "No tienes permiso para registrar estaciones." };
      expect(await recordScan(code, station.id)).toEqual(error);
      expect(await lookupAttendee(code)).toEqual(error);
    } finally {
      session.role = "STAFF";
    }
    expect(await prisma.scan.count({ where: { attendeeId: attendee.id } })).toBe(before);
  });

  it("Escaneo no entrega premios", async () => {
    const { prisma } = await import("@/lib/db");
    const { redeemPrize } = await import("@/app/actions/scan");
    session.role = "STAFF";
    expect(await redeemPrize(doneCode)).toEqual({ ok: false, error: "No tienes permiso para entregar premios." });
    const attendee = await prisma.attendee.findUniqueOrThrow({ where: { code: doneCode } });
    expect(attendee.redeemedAt).toBeNull();
  });

  it("dos redeemPrize simultáneos entregan un solo premio", async () => {
    const { prisma } = await import("@/lib/db");
    const { redeemPrize } = await import("@/app/actions/scan");
    session.role = "PRIZES";
    const results = await Promise.all([redeemPrize(doneCode), redeemPrize(doneCode)]);
    const statuses = results.map((r) => (r.ok ? r.status : "error")).sort();
    expect(statuses).toEqual(["premio", "repetido"]);
    expect(results.filter((r) => r.ok && r.message.startsWith("Premio entregado"))).toHaveLength(1);
    const attendee = await prisma.attendee.findUniqueOrThrow({ where: { code: doneCode } });
    expect(attendee.redeemedById).toBe(session.id);
    expect(attendee.redeemedAt).not.toBeNull();
    session.role = "STAFF";
  });
});
