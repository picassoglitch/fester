import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { toPublicPass, type StationProgress } from "@/lib/attendee";
import { ensureStations, hasLocalDb, testCode } from "./db";

const FORBIDDEN = ["id", "email", "phone", "createdAt", "redeemedByName", "name"];

const stations: StationProgress[] = [
  { id: "cmstation0000000000000001", name: "Registro", emoji: "🎟️", order: 1, visitedAt: "2026-11-05T16:00:00.000Z" },
  { id: "cmstation0000000000000002", name: "Kiosko 1", emoji: "1️⃣", order: 2, visitedAt: null },
];

describe("toPublicPass", () => {
  const pass = toPublicPass(
    { code: "ABC123", name: "Ana María López", completedAt: null, redeemedAt: null },
    stations,
  );

  it("no expone campos privados", () => {
    for (const key of FORBIDDEN) expect(pass).not.toHaveProperty(key);
    for (const station of pass.stations) expect(station).not.toHaveProperty("id");
    expect(JSON.stringify(pass)).not.toContain("cmstation");
  });

  it("solo manda el primer nombre", () => {
    expect(pass.firstName).toBe("Ana");
    expect(JSON.stringify(pass)).not.toContain("López");
  });

  it("cuenta estrellas", () => {
    expect(pass).toMatchObject({ stars: 1, total: 2, pending: 1 });
  });
});

describe.skipIf(!hasLocalDb)("GET /api/pase/[code] (base local)", () => {
  let code = "";
  let id = "";

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    await ensureStations();
    code = testCode();
    const attendee = await prisma.attendee.create({
      data: { code, name: "Prueba Pii Completa", email: "pii-test@example.com", phone: "5500000000" },
    });
    id = attendee.id;
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code } });
    await prisma.$disconnect();
  });

  it("no incluye correo, telefono ni cuid", async () => {
    const { GET } = await import("@/app/api/pase/[code]/route");
    const res = await GET(new Request(`http://localhost/api/pase/${code}`), {
      params: Promise.resolve({ code }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.text();
    for (const needle of ["pii-test@example.com", "5500000000", id, '"email"', '"phone"', '"id"', "Completa"]) {
      expect(body).not.toContain(needle);
    }
    expect(JSON.parse(body)).toMatchObject({ code, firstName: "Prueba" });
  });

  it("404 para un codigo inexistente", async () => {
    const { GET } = await import("@/app/api/pase/[code]/route");
    const res = await GET(new Request("http://localhost/api/pase/ZZZZZZ"), {
      params: Promise.resolve({ code: "ZZZZZZ" }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });
});
