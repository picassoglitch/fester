import { describe, expect, it, vi } from "vitest";
import { isLoginPinFormat, newPinError } from "@/lib/pin";

vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(async () => ({ id: "admin", name: "Admin", role: "ADMIN" })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    staff: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => ({ role: "ADMIN" })),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
  },
}));

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
}

describe("reglas de PIN", () => {
  it("el login acepta 4–8 digitos", () => {
    expect(isLoginPinFormat("1234")).toBe(true);
    expect(isLoginPinFormat("12345678")).toBe(true);
    expect(isLoginPinFormat("123")).toBe(false);
    expect(isLoginPinFormat("123456789")).toBe(false);
  });

  it("admin exige 8 digitos; staff 6–8", () => {
    expect(newPinError("12345678", "ADMIN")).toBeNull();
    expect(newPinError("123456", "ADMIN")).toMatch(/8 dígitos/);
    expect(newPinError("123456", "STAFF")).toBeNull();
    expect(newPinError("1234", "STAFF")).toMatch(/entre 6 y 8/);
  });
});

describe("createStaff / resetStaffPin", () => {
  it("rechaza un PIN de 6 digitos para ADMIN", async () => {
    const { createStaff } = await import("@/app/actions/admin");
    const { prisma } = await import("@/lib/db");
    const result = await createStaff({}, form({ name: "Nueva Admin", pin: "135792", role: "ADMIN" }));
    expect(result.error).toMatch(/8 dígitos/);
    expect(prisma.staff.create).not.toHaveBeenCalled();
  });

  it("acepta 6 digitos para STAFF", async () => {
    const { createStaff } = await import("@/app/actions/admin");
    const result = await createStaff({}, form({ name: "Staff Uno", pin: "135792", role: "STAFF" }));
    expect(result.ok).toBeTruthy();
  });

  it("resetStaffPin aplica la regla del rol guardado", async () => {
    const { resetStaffPin } = await import("@/app/actions/admin");
    const result = await resetStaffPin({}, form({ id: "x", pin: "135792" }));
    expect(result.error).toMatch(/8 dígitos/);
  });
});
