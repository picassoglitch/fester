import { describe, expect, it } from "vitest";
import { resolveSeedAdminPin } from "@/lib/pin";

describe("resolveSeedAdminPin", () => {
  it.each([undefined, "", "   ", "1234", "246810", "1234567", "123456789", "abcdefgh"])(
    "rechaza %j",
    (value) => {
      expect(() => resolveSeedAdminPin(value)).toThrow(/Falta ADMIN_PIN \(8 dígitos\)/);
    },
  );

  it("acepta 8 dígitos y el error nunca incluye el valor", () => {
    expect(resolveSeedAdminPin(" 97531864 ")).toBe("97531864");
    try {
      resolveSeedAdminPin("246810");
    } catch (error) {
      expect(String(error)).not.toContain("246810");
    }
  });
});
