import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hasLocalDb, testCode } from "./db";
import { CAPACITY, checkEntry } from "@/lib/access";

const session: { id: string; name: string; role: "STAFF" | "PRIZES" | "ADMIN" } = {
  id: "",
  name: "Puerta Pruebas",
  role: "STAFF",
};
vi.mock("@/lib/auth", () => ({ requireSession: vi.fn(async () => session) }));

describe("checkEntry", () => {
  const base = { approved: true, inside: false, insideCount: 0, override: false };
  it("aprobado con lugar entra", () => expect(checkEntry(base)).toEqual({ action: "enter" }));
  it("quien ya está dentro no cuenta doble", () =>
    expect(checkEntry({ ...base, inside: true, override: true })).toEqual({ action: "already" }));
  it("no aprobado pide confirmar y con override entra", () => {
    expect(checkEntry({ ...base, approved: false })).toEqual({ action: "confirm", reasons: ["no-aprobado"] });
    expect(checkEntry({ ...base, approved: false, override: true })).toEqual({ action: "enter" });
  });
  it("foro lleno pide confirmar, con las dos razones si aplica", () => {
    expect(checkEntry({ ...base, insideCount: CAPACITY - 1 })).toEqual({ action: "enter" });
    expect(checkEntry({ ...base, approved: false, insideCount: CAPACITY })).toEqual({
      action: "confirm",
      reasons: ["no-aprobado", "aforo-lleno"],
    });
  });
});

describe.skipIf(!hasLocalDb)("recordAccess (base local)", () => {
  const ok = testCode();
  const no = testCode();

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    const staff = await prisma.staff.create({ data: { name: "Puerta Pruebas", pinHash: "x" } });
    session.id = staff.id;
    await prisma.attendee.createMany({
      data: [
        { code: ok, name: "Puerta Aprobado", approved: true, completedAt: new Date() },
        { code: no, name: "Puerta No Aprobado", approved: false },
      ],
    });
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code: { in: [ok, no] } } });
    await prisma.staff.delete({ where: { id: session.id } });
    await prisma.$disconnect();
  });

  it("entrada, entrada repetida, salida y salida repetida mueven el conteo una sola vez", async () => {
    const { prisma } = await import("@/lib/db");
    const { recordAccess } = await import("@/app/actions/access");
    const before = await prisma.attendee.count({ where: { insideAt: { not: null } } });

    expect(await recordAccess(ok, "ENTRY")).toMatchObject({ ok: true, status: "entrada", inside: before + 1 });
    expect(await recordAccess(ok, "ENTRY")).toMatchObject({ ok: true, status: "ya-dentro", inside: before + 1 });
    expect(await recordAccess(ok, "EXIT")).toMatchObject({ ok: true, status: "salida", inside: before });
    expect(await recordAccess(ok, "EXIT")).toMatchObject({ ok: true, status: "ya-afuera", inside: before });

    const a = await prisma.attendee.findUniqueOrThrow({ where: { code: ok } });
    expect(await prisma.access.count({ where: { attendeeId: a.id } })).toBe(2);
  });

  it("la puerta no toca el pasaporte ni la rifa: no crea estrellas y la salida no saca del pool", async () => {
    const { prisma } = await import("@/lib/db");
    const { RAFFLE_POOL } = await import("@/lib/raffle");
    const a = await prisma.attendee.findUniqueOrThrow({ where: { code: ok } });
    expect(await prisma.scan.count({ where: { attendeeId: a.id } })).toBe(0);
    expect(a.completedAt).not.toBeNull();
    expect(await prisma.attendee.count({ where: { AND: [RAFFLE_POOL, { code: ok }] } })).toBe(1);
  });

  it("no aprobado pide confirmar sin contar; con Dejar pasar entra y queda marcado", async () => {
    const { prisma } = await import("@/lib/db");
    const { recordAccess } = await import("@/app/actions/access");
    const first = await recordAccess(no, "ENTRY");
    expect(first).toMatchObject({ ok: true, status: "confirmar", reasons: ["no-aprobado"] });
    const a = await prisma.attendee.findUniqueOrThrow({ where: { code: no } });
    expect(a.insideAt).toBeNull();

    expect(await recordAccess(no, "ENTRY", true)).toMatchObject({ ok: true, status: "entrada" });
    const log = await prisma.access.findFirstOrThrow({ where: { attendeeId: a.id } });
    expect(log).toMatchObject({ kind: "ENTRY", override: true, staffId: session.id });
    expect(JSON.stringify(first)).not.toMatch(/"email"|"phone"/);
  });

  it("código inexistente y rol Premios se rechazan", async () => {
    const { recordAccess } = await import("@/app/actions/access");
    expect(await recordAccess("ZZZZZZ9", "ENTRY")).toMatchObject({ ok: false });
    session.role = "PRIZES";
    expect(await recordAccess(ok, "ENTRY")).toMatchObject({ ok: false });
    session.role = "STAFF";
  });
});
