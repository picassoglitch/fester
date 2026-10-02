import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ensureStations, hasLocalDb, testCode } from "./db";

const session = { id: "", name: "Staff Pruebas", role: "STAFF" as const };
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

  it("dos redeemPrize simultáneos entregan un solo premio", async () => {
    const { redeemPrize } = await import("@/app/actions/scan");
    const results = await Promise.all([redeemPrize(doneCode), redeemPrize(doneCode)]);
    const statuses = results.map((r) => (r.ok ? r.status : "error")).sort();
    expect(statuses).toEqual(["premio", "repetido"]);
    expect(results.filter((r) => r.ok && r.message.startsWith("Premio entregado"))).toHaveLength(1);
  });
});
