import { describe, expect, it } from "vitest";
import { spanishValidityMessage, type ValidityLike } from "@/lib/validity";

const ok: ValidityLike = {
  valueMissing: false,
  typeMismatch: false,
  rangeUnderflow: false,
  rangeOverflow: false,
  badInput: false,
  patternMismatch: false,
};

describe("spanishValidityMessage", () => {
  it("campo vacío", () => {
    expect(spanishValidityMessage({ ...ok, valueMissing: true }, { type: "text", name: "name" })).toBe(
      "Completa este campo.",
    );
  });
  it("correo inválido", () => {
    expect(spanishValidityMessage({ ...ok, typeMismatch: true }, { type: "email", name: "email" })).toBe(
      "Escribe un correo válido.",
    );
  });
  it("edad fuera de rango usa AGE_LIMITS", () => {
    const field = { type: "number", name: "age", min: "15", max: "99" };
    expect(spanishValidityMessage({ ...ok, rangeUnderflow: true }, field)).toBe("Tu edad debe estar entre 15 y 99 años.");
    expect(spanishValidityMessage({ ...ok, rangeOverflow: true }, field)).toBe("Tu edad debe estar entre 15 y 99 años.");
  });
  it("aviso de privacidad sin aceptar", () => {
    expect(spanishValidityMessage({ ...ok, valueMissing: true }, { type: "checkbox", name: "privacy" })).toBe(
      "Necesitamos que aceptes el aviso de privacidad.",
    );
  });
  it("campo válido no pone mensaje", () => {
    expect(spanishValidityMessage(ok, { type: "text", name: "name" })).toBe("");
  });
});
