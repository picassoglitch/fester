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

export function mapStatus(attendee: {
  completedAt: Date | null;
  redeemedAt: Date | null;
}): MapStatus {
  if (attendee.redeemedAt) return "leaving";
  if (attendee.completedAt) return "prize";
  return "station";
}

/**
 * Quien aparece en el mapa: solo quien ya escaneo al menos una estacion y no
 * se fue (premio entregado hace mas de LEAVING_WINDOW_MS).
 */
export async function getMapSnapshot(now = new Date()) {
  const leftBefore = new Date(now.getTime() - LEAVING_WINDOW_MS);

  const [stations, attendees] = await Promise.all([
    prisma.station.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, emoji: true, active: true },
    }),
    prisma.attendee.findMany({
      where: {
        scans: { some: {} },
        OR: [{ redeemedAt: null }, { redeemedAt: { gte: leftBefore } }],
      },
      select: {
        id: true,
        name: true,
        position: true,
        completedAt: true,
        redeemedAt: true,
        scans: { orderBy: { createdAt: "desc" }, take: 1, select: { stationId: true } },
      },
    }),
  ]);

  const people: MapPerson[] = attendees
    .filter((a) => a.scans.length > 0)
    .map((a) => ({
      id: a.id,
      name: a.name,
      profile: profileOf(a.position),
      stationId: a.scans[0].stationId,
      status: mapStatus(a),
    }));

  // Las inactivas solo se dibujan si alguien sigue parado ahi.
  const occupied = new Set(people.map((p) => p.stationId));
  return {
    generatedAt: now.toISOString(),
    stations: stations.filter((s) => s.active || occupied.has(s.id)),
    people,
  };
}
