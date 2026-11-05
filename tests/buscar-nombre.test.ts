import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hasLocalDb, testCode } from "./db";
import { searchPatterns } from "@/lib/name-search";

const session: { id: string; name: string; role: "STAFF" | "PRIZES" | "ADMIN" } = { id: "x", name: "Busca", role: "STAFF" };
vi.mock("@/lib/auth", () => ({ requireSession: vi.fn(async () => session) }));

describe("searchPatterns", () => {
  it("menos de 3 letras no busca", () => {
    expect(searchPatterns("ma")).toEqual([]);
    expect(searchPatterns(" a b ")).toEqual([]);
  });
  it("quita acentos y comodines y separa palabras", () => {
    expect(searchPatterns("  José   PEÑA ")).toEqual(["%jose%", "%pena%"]);
    expect(searchPatterns("50%_x")).toEqual(["%50%", "%x%"]);
  });
});

describe.skipIf(!hasLocalDb)("findAttendeesByName (base real)", () => {
  const tag = testCode().toLowerCase();
  const codes = [testCode(), testCode(), testCode()];

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.createMany({
      data: [
        { code: codes[0], name: `José Peña ${tag}`, company: "Obras", state: "Puebla", email: "jp@x.mx", phone: "555" },
        { code: codes[1], name: `Maria Jose Ruiz ${tag}` },
        { code: codes[2], name: `Pedro Peñaloza ${tag}` },
      ],
    });
  });
  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code: { in: codes } } });
    await prisma.$disconnect();
  });

  it("encuentra sin acentos, en cualquier orden, y no expone correo ni teléfono", async () => {
    const { findAttendeesByName } = await import("@/app/actions/scan");
    const found = await findAttendeesByName(`pena jose ${tag}`);
    expect(found).toEqual([{ code: codes[0], name: `José Peña ${tag}`, company: "Obras", state: "Puebla" }]);
    const both = await findAttendeesByName(`jose ${tag}`);
    expect(both.map((m) => m.code).sort()).toEqual([codes[0], codes[1]].sort());
    expect((await findAttendeesByName(`peña ${tag}`)).length).toBe(2);
  });

  it("búsqueda corta o con comodines no trae a todos", async () => {
    const { findAttendeesByName } = await import("@/app/actions/scan");
    expect(await findAttendeesByName("jo")).toEqual([]);
    expect(await findAttendeesByName("%%%")).toEqual([]);
  });
});
