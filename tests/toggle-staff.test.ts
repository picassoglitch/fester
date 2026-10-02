import { beforeEach, describe, expect, it, vi } from "vitest";

const session = { id: "admin1", name: "A", role: "ADMIN", sessionVersion: 0 };
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT ${url}`);
});
const db = {
  staff: { findUnique: vi.fn(), count: vi.fn(), update: vi.fn(async () => ({})) },
};

vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn(async () => session) }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: db }));

function form(id: string) {
  const data = new FormData();
  data.set("id", id);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("toggleStaff", () => {
  it("no desactiva al único admin", async () => {
    const { toggleStaff } = await import("@/app/actions/admin");
    db.staff.findUnique.mockResolvedValue({ active: true, role: "ADMIN" });
    db.staff.count.mockResolvedValue(1);
    await expect(toggleStaff(form("admin2"))).rejects.toThrow("REDIRECT /admin/staff?aviso=desactivar");
    expect(db.staff.update).not.toHaveBeenCalled();
  });

  it("no deja que un admin se desactive a sí mismo", async () => {
    const { toggleStaff } = await import("@/app/actions/admin");
    db.staff.findUnique.mockResolvedValue({ active: true, role: "ADMIN" });
    db.staff.count.mockResolvedValue(3);
    await expect(toggleStaff(form("admin1"))).rejects.toThrow("REDIRECT");
    expect(db.staff.update).not.toHaveBeenCalled();
  });

  it("sí desactiva a otro admin si quedan más", async () => {
    const { toggleStaff } = await import("@/app/actions/admin");
    db.staff.findUnique.mockResolvedValue({ active: true, role: "ADMIN" });
    db.staff.count.mockResolvedValue(2);
    await toggleStaff(form("admin2"));
    expect(db.staff.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "admin2" }, data: { active: false, sessionVersion: { increment: 1 } } }),
    );
  });
});
