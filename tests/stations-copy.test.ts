import { describe, expect, it } from "vitest";
import { JOURNEY } from "@/lib/event";

describe("texto del recorrido", () => {
  const text = JSON.stringify(JOURNEY);

  it("no fija un número de estaciones: las define el admin", () => {
    expect(text).toContain("todas las estaciones del recorrido");
    expect(text).toContain("en cada estación");
    expect(text).not.toMatch(
      /\b(las|los) (\d+|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez) (estaciones|kioskos)\b/i,
    );
  });

  it("ya no promete registro y cinco kioskos como meta", () => {
    expect(text).not.toContain("registro y");
    expect(text).not.toContain("cinco kioskos");
    expect(text).not.toContain("seis estaciones");
  });
});
