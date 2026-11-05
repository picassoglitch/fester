import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hasLocalDb, testCode } from "./db";

const requireAdmin = vi.fn(async () => ({ id: "", name: "Admin", role: "ADMIN" as const }));
vi.mock("@/lib/auth", () => ({ requireAdmin, requireSession: requireAdmin }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

function form(code: string) {
  const data = new FormData();
  data.set("code", code);
  return data;
}

describe.skipIf(!hasLocalDb)("habilitar sin completar el pasaporte (base local)", () => {
  const code = testCode();
  const doneCode = testCode();
  const earlier = new Date("2026-11-05T15:00:00Z");

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.create({
      data: { code, name: "Habilitar Prueba", approved: true, festerProfile: "Aplicador" },
    });
    await prisma.attendee.create({ data: { code: doneCode, name: "Ya Completo", completedAt: earlier } });
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code: { in: [code, doneCode] } } });
    await prisma.$disconnect();
  });

  it("marca el pase completo: entra a la rifa y la mesa de premios lo entrega", async () => {
    const { prisma } = await import("@/lib/db");
    const { enableWithoutPassport } = await import("@/app/actions/admin");
    const { getRafflePools } = await import("@/lib/raffle");
    expect((await getRafflePools()).Aplicador.some((c) => c.code === code)).toBe(false);

    await enableWithoutPassport(form(code));

    const after = await prisma.attendee.findUniqueOrThrow({ where: { code } });
    expect(after.completedAt).not.toBeNull();
    expect(after.redeemedAt).toBeNull();
    expect((await getRafflePools()).Aplicador.some((c) => c.code === code)).toBe(true);
  });

  it("no cambia la fecha de quien ya había completado", async () => {
    const { prisma } = await import("@/lib/db");
    const { enableWithoutPassport } = await import("@/app/actions/admin");
    await enableWithoutPassport(form(doneCode));
    expect((await prisma.attendee.findUniqueOrThrow({ where: { code: doneCode } })).completedAt).toEqual(earlier);
  });

  it("sin rol de administrador no habilita", async () => {
    const { prisma } = await import("@/lib/db");
    const { enableWithoutPassport } = await import("@/app/actions/admin");
    await prisma.attendee.update({ where: { code }, data: { completedAt: null } });
    requireAdmin.mockRejectedValueOnce(new Error("Se requiere rol de administrador"));
    await expect(enableWithoutPassport(form(code))).rejects.toThrow();
    expect((await prisma.attendee.findUniqueOrThrow({ where: { code } })).completedAt).toBeNull();
  });
});
