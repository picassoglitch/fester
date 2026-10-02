import { describe, expect, it } from "vitest";
import { JOURNEY } from "@/lib/event";
import { DEFAULT_STATIONS, spanishNumber } from "@/lib/stations";

describe("texto del recorrido", () => {
  const text = JSON.stringify(JOURNEY);

  it("dice el mismo número de estaciones que DEFAULT_STATIONS", () => {
    const n = DEFAULT_STATIONS.length;
    expect(text).toContain(`las ${spanishNumber(n)} estaciones`);
    expect(text).toContain(`registro y ${spanishNumber(n - 1)} kioskos`);
  });

  it("ya no promete cinco kioskos como meta", () => {
    expect(text).not.toContain("cinco kioskos y completar");
    expect(text).not.toContain("en los cinco kioskos");
  });
});
