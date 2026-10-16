import { describe, expect, it } from "vitest";
import type { MapPerson } from "@/lib/map";
import { diffEvents } from "@/lib/map-events";

const p = (over: Partial<MapPerson> = {}): MapPerson => ({
  id: "p1",
  name: "Ana López",
  profile: "Arquitecto",
  stationId: "a",
  status: "station",
  ...over,
});

describe("eventos del mapa entre dos sondeos", () => {
  it("sin cambios no hay eventos", () => {
    expect(diffEvents([p()], [p()])).toEqual([]);
  });

  it("primer escaneo de alguien: escaneo en su estacion", () => {
    expect(diffEvents([], [p()])).toEqual([
      { kind: "scan", personId: "p1", name: "Ana López", profile: "Arquitecto", stationId: "a" },
    ]);
  });

  it("escaneo en otra estacion", () => {
    expect(diffEvents([p()], [p({ stationId: "b" })])).toMatchObject([{ kind: "scan", stationId: "b" }]);
  });

  it("completar el recorrido, aunque no lo hayamos visto antes", () => {
    expect(diffEvents([p()], [p({ stationId: "b", status: "prize" })])).toMatchObject([
      { kind: "complete", stationId: "b" },
    ]);
    expect(diffEvents([], [p({ status: "prize" })])).toMatchObject([{ kind: "complete" }]);
  });

  it("recoger el premio", () => {
    expect(diffEvents([p({ status: "prize" })], [p({ status: "leaving" })])).toMatchObject([
      { kind: "prize" },
    ]);
  });

  it("quien llega ya con premio no se anuncia (no se le dibuja)", () => {
    expect(diffEvents([], [p({ status: "leaving" })])).toEqual([]);
  });

  it("quien sale del sondeo no genera evento", () => {
    expect(diffEvents([p()], [])).toEqual([]);
  });
});
