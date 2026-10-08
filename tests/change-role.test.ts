import { beforeEach, describe, expect, it, vi } from "vitest";

const session = { id: "admin1", name: "A", role: "ADMIN", sessionVersion: 0 };
const db = {
  staff: {
    findUnique: vi.fn(),
    findMany: vi.fn(async () => [] as { pinHash: string }[]),
    count: vi.fn(),
    update: vi.fn(async () => ({})),
  },
};

vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn(async () => session) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: db }));

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("changeStaffRole", () => {
  it("cambiar el rol sube sessionVersion", async () => {
    const { changeStaffRole } = await import("@/app/actions/admin");
    db.staff.findUnique.mockResolvedValue({ active: true, role: "STAFF" });
    const result = await changeStaffRole({}, form({ id: "s1", role: "PRIZES" }));
    expect(result).toEqual({ ok: "Rol cambiado a Premios." });
    expect(db.staff.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { role: "PRIZES", sessionVersion: { increment: 1 } },
    });
  });

  it("no le quita el rol al último admin activo", async () => {
    const { changeStaffRole } = await import("@/app/actions/admin");
    db.staff.findUnique.mockResolvedValue({ active: true, role: "ADMIN" });
    db.staff.count.mockResolvedValue(1);
    const result = await changeStaffRole({}, form({ id: "admin2", role: "PRIZES" }));
    expect(result.error).toMatch(/último administrador/);
    expect(db.staff.update).not.toHaveBeenCalled();
  });

  it("sí baja a un admin si quedan más", async () => {
    const { changeStaffRole } = await import("@/app/actions/admin");
    db.staff.findUnique.mockResolvedValue({ active: true, role: "ADMIN" });
    db.staff.count.mockResolvedValue(2);
    const result = await changeStaffRole({}, form({ id: "admin2", role: "STAFF" }));
    expect(result.ok).toBeDefined();
    expect(db.staff.update).toHaveBeenCalledWith({
      where: { id: "admin2" },
      data: { role: "STAFF", sessionVersion: { increment: 1 } },
    });
  });

  it("no deja que un admin cambie su propio rol", async () => {
    const { changeStaffRole } = await import("@/app/actions/admin");
    db.staff.findUnique.mockResolvedValue({ active: true, role: "ADMIN" });
    db.staff.count.mockResolvedValue(5);
    const result = await changeStaffRole({}, form({ id: "admin1", role: "STAFF" }));
    expect(result.error).toBeDefined();
    expect(db.staff.update).not.toHaveBeenCalled();
  });

  it("hacer administrador exige un PIN nuevo de 8 dígitos", async () => {
    const { changeStaffRole } = await import("@/app/actions/admin");
    db.staff.findUnique.mockResolvedValue({ active: true, role: "STAFF" });
    expect((await changeStaffRole({}, form({ id: "s1", role: "ADMIN" }))).error).toMatch(/8 dígitos/);
    expect((await changeStaffRole({}, form({ id: "s1", role: "ADMIN", pin: "123456" }))).error).toMatch(/8 dígitos/);
    expect(db.staff.update).not.toHaveBeenCalled();

    const ok = await changeStaffRole({}, form({ id: "s1", role: "ADMIN", pin: "73915284" }));
    expect(ok.ok).toBeDefined();
    expect(db.staff.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { role: "ADMIN", pinHash: expect.any(String), sessionVersion: { increment: 1 } },
    });
  });

  it("rechaza un rol inválido", async () => {
    const { changeStaffRole } = await import("@/app/actions/admin");
    expect((await changeStaffRole({}, form({ id: "s1", role: "ROOT" }))).error).toBeDefined();
    expect(db.staff.update).not.toHaveBeenCalled();
  });
});

describe("createStaff con roles", () => {
  it("crea a alguien de Premios con PIN de 6 dígitos", async () => {
    const { createStaff } = await import("@/app/actions/admin");
    const create = vi.fn(async () => ({}));
    (db.staff as unknown as { create: typeof create }).create = create;
    const result = await createStaff({}, form({ name: "QA Premios", pin: "482913", role: "PRIZES" }));
    expect(result.ok).toBeDefined();
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ name: "QA Premios", role: "PRIZES" }) });
  });
});
