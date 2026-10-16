import type { MapPerson } from "@/lib/map";

/**
 * Lo que paso entre dos sondeos del mapa, para el destello en el kiosko y el
 * nombre que sube: alguien escaneo, completo el recorrido o recogio su premio.
 */
export type MapEvent = {
  kind: "scan" | "complete" | "prize";
  personId: string;
  name: string;
  profile: string;
  /** Estacion de su ultimo escaneo. */
  stationId: string;
};

function event(kind: MapEvent["kind"], person: MapPerson): MapEvent {
  return {
    kind,
    personId: person.id,
    name: person.name,
    profile: person.profile,
    stationId: person.stationId,
  };
}

export function diffEvents(prev: readonly MapPerson[], next: readonly MapPerson[]): MapEvent[] {
  const before = new Map(prev.map((person) => [person.id, person]));
  const events: MapEvent[] = [];

  for (const person of next) {
    const old = before.get(person.id);
    if (person.status === "leaving") {
      // Quien aparece ya con premio no se dibuja: tampoco se anuncia.
      if (old && old.status !== "leaving") events.push(event("prize", person));
    } else if (person.status === "prize") {
      if (old?.status !== "prize") events.push(event("complete", person));
    } else if (!old || old.stationId !== person.stationId) {
      events.push(event("scan", person));
    }
  }
  return events;
}
