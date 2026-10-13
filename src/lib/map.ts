import { prisma } from "@/lib/db";
import { profileOf } from "@/lib/profiles";

/**
 * Cuanto tiempo sigue en el mapa alguien que ya recibio su premio: lo justo
 * para que el panel lo vea caminar a la salida en el siguiente sondeo.
 */
export const LEAVING_WINDOW_MS = 3 * 60 * 1000;

/** Donde esta cada asistente segun sus escaneos (decision de Aldo, 13 oct). */
export type MapStatus = "station" | "prize" | "leaving";

export type MapPerson = {
  id: string;
  name: string;
  profile: string;
  /** Estacion de su ultimo escaneo. */
  stationId: string;
  status: MapStatus;
};

export type MapSnapshot = Awaited<ReturnType<typeof getMapSnapshot>>;

export function mapStatus(attendee: { completed: boolean; redeemed: boolean }): MapStatus {
  if (attendee.redeemed) return "leaving";
  if (attendee.completed) return "prize";
  return "station";
}

/**
 * Quien aparece en el mapa: solo quien ya escaneo al menos una estacion y no
 * se fue (premio entregado hace mas de LEAVING_WINDOW_MS).
 */
type MapRow = {
  id: string;
  name: string;
  position: string | null;
  completed: boolean;
  redeemed: boolean;
  stationId: string;
};

export async function getMapSnapshot(now = new Date()) {
  const leftBefore = new Date(now.getTime() - LEAVING_WINDOW_MS);

  const [stations, rows] = await Promise.all([
    prisma.station.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, emoji: true, active: true },
    }),
    // Una fila por asistente con su ultimo escaneo (DISTINCT ON), en vez de
    // traer todos los escaneos de todos cada 5 s. createdAt/redeemedAt son
    // timestamps sin zona en UTC: por eso el AT TIME ZONE.
    prisma.$queryRaw<MapRow[]>`
      SELECT a."id", a."name", a."position",
             a."completedAt" IS NOT NULL AS completed,
             a."redeemedAt" IS NOT NULL AS redeemed,
             last."stationId"
      FROM "Attendee" a
      JOIN (
        SELECT DISTINCT ON (s."attendeeId") s."attendeeId", s."stationId"
        FROM "Scan" s
        ORDER BY s."attendeeId", s."createdAt" DESC, s."id" DESC
      ) last ON last."attendeeId" = a."id"
      WHERE a."redeemedAt" IS NULL
         OR a."redeemedAt" >= (${leftBefore}::timestamptz AT TIME ZONE 'UTC')`,
  ]);

  const people: MapPerson[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    profile: profileOf(row.position),
    stationId: row.stationId,
    status: mapStatus({ completed: row.completed, redeemed: row.redeemed }),
  }));

  // Las inactivas solo se dibujan si alguien sigue parado ahi.
  const occupied = new Set(people.map((p) => p.stationId));
  return {
    generatedAt: now.toISOString(),
    stations: stations.filter((s) => s.active || occupied.has(s.id)),
    people,
  };
}
