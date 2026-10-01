/**
 * Estaciones del recorrido: una sola lista para el seed, el script de
 * sincronizacion y el texto de la landing. El premio exige todas las activas
 * (syncCompletion), asi que la landing no puede decir otro numero.
 * prisma/sql/estaciones.sql replica esta lista a mano.
 */
export const DEFAULT_STATIONS = [
  { name: "Registro", emoji: "🎟️" },
  { name: "Kiosko 1", emoji: "1️⃣" },
  { name: "Kiosko 2", emoji: "2️⃣" },
  { name: "Kiosko 3", emoji: "3️⃣" },
  { name: "Kiosko 4", emoji: "4️⃣" },
  { name: "Kiosko 5", emoji: "5️⃣" },
] as const;

const NUMBER_WORDS = ["cero", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];

/** Numero en palabra (1–10, femenino para "estaciones"); fuera de rango, el numeral. */
export function spanishNumber(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

export const STATION_COUNT = DEFAULT_STATIONS.length;
