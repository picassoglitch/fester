import { describe, expect, it } from "vitest";
import { hasLocalDb } from "./db";
import { checkSessionToken, createSessionToken, verifySessionToken } from "@/lib/auth";
import { newPinError } from "@/lib/pin";
import { canOpenPath } from "@/lib/roles";
import { postLoginTarget, staffCodeTarget } from "@/lib/safe-redirect";
import { SignJWT } from "jose";

describe("verifySessionToken con roles", () => {
  it("conserva PRIZES (no lo convierte en STAFF, que lo sacaria de la sesion)", async () => {
    const token = await createSessionToken({ id: "p1", name: "Premios", role: "PRIZES", sessionVersion: 3 });
    expect(await verifySessionToken(token)).toEqual({ id: "p1", name: "Premios", role: "PRIZES", sessionVersion: 3 });
  });

  it("conserva STAFF y ADMIN", async () => {
    for (const role of ["STAFF", "ADMIN"] as const) {
      const token = await createSessionToken({ id: "x", name: "X", role, sessionVersion: 0 });
      expect((await verifySessionToken(token))?.role).toBe(role);
    }
  });

  it("rechaza un rol desconocido", async () => {
    const token = await new SignJWT({ name: "X", role: "ROOT", scope: "staff", sv: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("abc")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.SESSION_SECRET));
    expect(await verifySessionToken(token)).toBeNull();
  });
});

describe.skipIf(!hasLocalDb)("checkSessionToken con Premios (base local)", () => {
  it("una sesión de Premios vigente sigue abierta y un cambio de rol la cierra", async () => {
    const { prisma } = await import("@/lib/db");
    const staff = await prisma.staff.create({ data: { name: "Premios Prueba", pinHash: "x", role: "PRIZES" } });
    try {
      const token = await createSessionToken({ id: staff.id, name: staff.name, role: "PRIZES", sessionVersion: 0 });
      expect(await checkSessionToken(token)).toMatchObject({ id: staff.id, role: "PRIZES" });
      await prisma.staff.update({ where: { id: staff.id }, data: { role: "STAFF", sessionVersion: { increment: 1 } } });
      expect(await checkSessionToken(token)).toBeNull();
    } finally {
      await prisma.staff.delete({ where: { id: staff.id } });
    }
  });
});

describe("newPinError para Premios", () => {
  it("usa la misma regla de 6–8 dígitos que Escaneo", () => {
    expect(newPinError("123456", "PRIZES")).toBeNull();
    expect(newPinError("12345678", "PRIZES")).toBeNull();
    expect(newPinError("12345", "PRIZES")).toBe(newPinError("12345", "STAFF"));
    expect(newPinError("123456789", "PRIZES")).not.toBeNull();
    expect(newPinError("12a456", "PRIZES")).not.toBeNull();
  });
});

describe("postLoginTarget por rol", () => {
  it("Premios siempre aterriza en premios y conserva el pase", () => {
    expect(postLoginTarget(undefined, "PRIZES")).toBe("/staff/premios");
    expect(postLoginTarget("/staff/escanear", "PRIZES")).toBe("/staff/premios");
    expect(postLoginTarget("/staff/escanear?code=FV28QG", "PRIZES")).toBe("/staff/premios?code=FV28QG");
    expect(postLoginTarget("/admin", "PRIZES")).toBe("/staff/premios");
    expect(postLoginTarget("/admin/staff", "PRIZES")).toBe("/staff/premios");
    expect(postLoginTarget("/staff/premios?code=FV28QG", "PRIZES")).toBe("/staff/premios?code=FV28QG");
  });

  it("Escaneo nunca aterriza en premios ni en /admin", () => {
    expect(postLoginTarget(undefined, "STAFF")).toBe("/staff/escanear");
    expect(postLoginTarget("/staff/premios", "STAFF")).toBe("/staff/escanear");
    expect(postLoginTarget("/staff/premios?code=FV28QG", "STAFF")).toBe("/staff/escanear?code=FV28QG");
    expect(postLoginTarget("/admin", "STAFF")).toBe("/staff/escanear");
    expect(postLoginTarget("/staff/escanear?code=FV28QG", "STAFF")).toBe("/staff/escanear?code=FV28QG");
  });

  it("Administrador sigue como antes", () => {
    expect(postLoginTarget(undefined, "ADMIN")).toBe("/admin");
    expect(postLoginTarget("/staff/premios", "ADMIN")).toBe("/staff/premios");
    expect(postLoginTarget("/staff/escanear?code=FV28QG", "ADMIN")).toBe("/staff/escanear?code=FV28QG");
    expect(postLoginTarget("/admin/staff", "ADMIN")).toBe("/admin/staff");
  });

  it("/s/CODE lleva a cada rol a su pantalla con el pase precargado", () => {
    expect(staffCodeTarget("FV28QG", "PRIZES")).toBe("/staff/premios?code=FV28QG");
    expect(staffCodeTarget("FV28QG", "STAFF")).toBe("/staff/escanear?code=FV28QG");
    expect(staffCodeTarget("FV28QG", "ADMIN")).toBe("/staff/escanear?code=FV28QG");
  });
});

describe("canOpenPath (proxy)", () => {
  it("matriz de acceso", () => {
    expect(canOpenPath("PRIZES", "/staff/premios")).toBe(true);
    expect(canOpenPath("PRIZES", "/staff/escanear")).toBe(false);
    expect(canOpenPath("PRIZES", "/admin")).toBe(false);
    expect(canOpenPath("STAFF", "/staff/escanear")).toBe(true);
    expect(canOpenPath("STAFF", "/staff/premios")).toBe(false);
    expect(canOpenPath("STAFF", "/admin/staff")).toBe(false);
    for (const path of ["/admin", "/admin/staff", "/staff/escanear", "/staff/premios"]) {
      expect(canOpenPath("ADMIN", path)).toBe(true);
    }
  });
});
