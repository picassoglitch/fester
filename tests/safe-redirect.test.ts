import { describe, expect, it } from "vitest";
import { postLoginTarget, safeNextPath } from "@/lib/safe-redirect";

describe("safeNextPath", () => {
  it.each([
    "//evil.com",
    "/\\evil.com",
    "/%5Cevil.com",
    "/%2F%2Fevil.com",
    "/%252F%252Fevil.com",
    "https://evil.com",
    "javascript:alert(1)",
    " /admin",
    "/\t/evil.com",
    "/pase/X",
    "",
    "/",
    "/staffevil",
  ])("rechaza %j", (raw) => {
    expect(safeNextPath(raw)).toBe("/staff/escanear");
  });

  it("rechaza lo que no es string", () => {
    expect(safeNextPath(undefined)).toBe("/staff/escanear");
    expect(safeNextPath(["/admin"])).toBe("/staff/escanear");
  });

  it.each(["/admin", "/staff/premios", "/staff/escanear?code=ABC123", "/admin/asistentes/ABC123"])(
    "conserva %j",
    (raw) => {
      expect(safeNextPath(raw)).toBe(raw);
    },
  );
});

describe("postLoginTarget", () => {
  it("STAFF con /admin va al escáner", () => {
    expect(postLoginTarget("/admin", "STAFF")).toBe("/staff/escanear");
    expect(postLoginTarget("/admin/staff", "STAFF")).toBe("/staff/escanear");
  });
  it("ADMIN sin destino va al panel", () => {
    expect(postLoginTarget(undefined, "ADMIN")).toBe("/admin");
    expect(postLoginTarget("/staff/premios", "ADMIN")).toBe("/staff/premios");
  });
});
