import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hasLocalDb } from "./db";
import { checkSessionToken, createSessionToken, verifySessionToken } from "@/lib/auth";
import { SignJWT } from "jose";

describe("verifySessionToken", () => {
  it("rechaza tokens sin sv", async () => {
    const legacy = await new SignJWT({ name: "X", role: "ADMIN", scope: "staff" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("abc")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.SESSION_SECRET));
    expect(await verifySessionToken(legacy)).toBeNull();
  });
});

describe.skipIf(!hasLocalDb)("checkSessionToken (base local)", () => {
  let id = "";

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    const staff = await prisma.staff.create({ data: { name: "Sesion Prueba", pinHash: "x" } });
    id = staff.id;
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.staff.deleteMany({ where: { id } });
    await prisma.$disconnect();
  });

  it("una sesion vigente pasa y usa el rol de la base", async () => {
    const token = await createSessionToken({ id, name: "Sesion Prueba", role: "STAFF", sessionVersion: 0 });
    expect(await checkSessionToken(token)).toMatchObject({ id, role: "STAFF" });
  });

  it("sv viejo -> null", async () => {
    const { prisma } = await import("@/lib/db");
    const token = await createSessionToken({ id, name: "Sesion Prueba", role: "STAFF", sessionVersion: 0 });
    await prisma.staff.update({ where: { id }, data: { sessionVersion: { increment: 1 } } });
    expect(await checkSessionToken(token)).toBeNull();
  });

  it("rol distinto al de la base -> null", async () => {
    const { prisma } = await import("@/lib/db");
    const { sessionVersion } = await prisma.staff.findUniqueOrThrow({ where: { id } });
    const token = await createSessionToken({ id, name: "Sesion Prueba", role: "ADMIN", sessionVersion });
    expect(await checkSessionToken(token)).toBeNull();
  });

  it("staff desactivado -> null", async () => {
    const { prisma } = await import("@/lib/db");
    const { sessionVersion } = await prisma.staff.findUniqueOrThrow({ where: { id } });
    const token = await createSessionToken({ id, name: "Sesion Prueba", role: "STAFF", sessionVersion });
    expect(await checkSessionToken(token)).not.toBeNull();
    await prisma.staff.update({ where: { id }, data: { active: false } });
    expect(await checkSessionToken(token)).toBeNull();
  });
});
