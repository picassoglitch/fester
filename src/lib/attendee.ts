import { prisma } from "@/lib/db";

export type StationProgress = {
  id: string;
  name: string;
  emoji: string;
  order: number;
  visitedAt: string | null;
};

export type AttendeeProgress = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  completedAt: string | null;
  redeemedAt: string | null;
  redeemedByName: string | null;
  stars: number;
  total: number;
  pending: number;
  stations: StationProgress[];
};

export async function getAttendeeProgress(code: string): Promise<AttendeeProgress | null> {
  const attendee = await prisma.attendee.findUnique({
    where: { code },
    include: {
      redeemedBy: { select: { name: true } },
      scans: { select: { stationId: true, createdAt: true } },
    },
  });
  if (!attendee) return null;

  const stations = await prisma.station.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  const scanByStation = new Map(attendee.scans.map((s) => [s.stationId, s.createdAt]));
  const progress: StationProgress[] = stations.map((station) => ({
    id: station.id,
    name: station.name,
    emoji: station.emoji,
    order: station.order,
    visitedAt: scanByStation.get(station.id)?.toISOString() ?? null,
  }));

  const stars = progress.filter((s) => s.visitedAt).length;

  return {
    id: attendee.id,
    code: attendee.code,
    name: attendee.name,
    email: attendee.email,
    phone: attendee.phone,
    createdAt: attendee.createdAt.toISOString(),
    completedAt: attendee.completedAt?.toISOString() ?? null,
    redeemedAt: attendee.redeemedAt?.toISOString() ?? null,
    redeemedByName: attendee.redeemedBy?.name ?? null,
    stars,
    total: progress.length,
    pending: progress.length - stars,
    stations: progress,
  };
}

/**
 * Marca completedAt cuando el asistente ya tiene todas las estaciones activas.
 * Se llama despues de cada escaneo.
 */
export async function syncCompletion(attendeeId: string): Promise<Date | null> {
  const [activeStations, attendee] = await Promise.all([
    prisma.station.findMany({ where: { active: true }, select: { id: true } }),
    prisma.attendee.findUnique({
      where: { id: attendeeId },
      select: { completedAt: true, scans: { select: { stationId: true } } },
    }),
  ]);
  if (!attendee) return null;

  const visited = new Set(attendee.scans.map((s) => s.stationId));
  const complete = activeStations.length > 0 && activeStations.every((s) => visited.has(s.id));

  if (complete && !attendee.completedAt) {
    const updated = await prisma.attendee.update({
      where: { id: attendeeId },
      data: { completedAt: new Date() },
      select: { completedAt: true },
    });
    return updated.completedAt;
  }
  if (!complete && attendee.completedAt) {
    // Una estacion nueva reabre el recorrido de quien ya habia terminado.
    await prisma.attendee.update({ where: { id: attendeeId }, data: { completedAt: null } });
    return null;
  }
  return attendee.completedAt;
}
