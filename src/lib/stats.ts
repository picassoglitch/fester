import { prisma } from "@/lib/db";

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;

export async function getDashboardStats() {
  const now = Date.now();
  const lastHour = new Date(now - 60 * 60 * 1000);
  const last15 = new Date(now - 15 * 60 * 1000);

  const [
    stations,
    totalAttendees,
    completedAttendees,
    redeemedAttendees,
    totalScans,
    scansLast15,
    scansLastHour,
    scanGroups,
    staffGroups,
    recentScans,
    recentAttendees,
    completedTimes,
    registrations,
  ] = await Promise.all([
    prisma.station.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
    prisma.attendee.count(),
    prisma.attendee.count({ where: { completedAt: { not: null } } }),
    prisma.attendee.count({ where: { redeemedAt: { not: null } } }),
    prisma.scan.count(),
    prisma.scan.count({ where: { createdAt: { gte: last15 } } }),
    prisma.scan.count({ where: { createdAt: { gte: lastHour } } }),
    prisma.scan.groupBy({ by: ["stationId"], _count: { _all: true }, _max: { createdAt: true } }),
    prisma.scan.groupBy({ by: ["staffId"], _count: { _all: true } }),
    prisma.scan.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        attendee: { select: { name: true, code: true } },
        station: { select: { name: true, emoji: true } },
        staff: { select: { name: true } },
      },
    }),
    prisma.attendee.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { name: true, code: true, createdAt: true },
    }),
    prisma.attendee.findMany({
      where: { completedAt: { not: null } },
      select: { createdAt: true, completedAt: true },
    }),
    prisma.attendee.findMany({ select: { createdAt: true } }),
  ]);

  const activeStations = stations.filter((s) => s.active);
  const scanCountByStation = new Map(scanGroups.map((g) => [g.stationId, g._count._all]));
  const lastScanByStation = new Map(scanGroups.map((g) => [g.stationId, g._max.createdAt]));

  const stationStats = stations.map((station) => {
    const visits = scanCountByStation.get(station.id) ?? 0;
    return {
      id: station.id,
      name: station.name,
      emoji: station.emoji,
      order: station.order,
      active: station.active,
      visits,
      pending: Math.max(0, totalAttendees - visits),
      rate: totalAttendees > 0 ? visits / totalAttendees : 0,
      lastScanAt: lastScanByStation.get(station.id)?.toISOString() ?? null,
    };
  });

  // Distribucion de estrellas: cuantos asistentes tienen 0, 1, 2 ... N estrellas.
  const starCounts = await prisma.attendee.findMany({
    select: { id: true, scans: { select: { stationId: true } } },
  });
  const activeIds = new Set(activeStations.map((s) => s.id));
  const distribution = new Array(activeStations.length + 1).fill(0) as number[];
  for (const attendee of starCounts) {
    const stars = attendee.scans.filter((s) => activeIds.has(s.stationId)).length;
    const bucket = Math.min(stars, activeStations.length);
    distribution[bucket] += 1;
  }

  const completionDurations = completedTimes
    .filter((a) => a.completedAt)
    .map((a) => a.completedAt!.getTime() - a.createdAt.getTime())
    .filter((ms) => ms >= 0)
    .sort((a, b) => a - b);
  const medianCompletionMs =
    completionDurations.length > 0
      ? completionDurations[Math.floor(completionDurations.length / 2)]
      : null;

  const staffCountById = new Map(staffGroups.map((g) => [g.staffId ?? "", g._count._all]));
  const staffRows = await prisma.staff.findMany({ orderBy: { name: "asc" } });
  const staffStats = staffRows
    .map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      active: s.active,
      scans: staffCountById.get(s.id) ?? 0,
    }))
    .sort((a, b) => b.scans - a.scans);

  // Registros por hora del dia (para ver el flujo de entrada).
  const byHour = new Map<string, number>();
  for (const { createdAt } of registrations) {
    const key = new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      hour12: false,
      timeZone: process.env.NEXT_PUBLIC_TIME_ZONE || "America/Mexico_City",
    }).format(createdAt);
    byHour.set(key, (byHour.get(key) ?? 0) + 1);
  }
  const registrationsByHour = [...byHour.entries()]
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  const totalPossible = totalAttendees * activeStations.length;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      attendees: totalAttendees,
      completed: completedAttendees,
      redeemed: redeemedAttendees,
      pendingPrizes: completedAttendees - redeemedAttendees,
      scans: totalScans,
      scansLast15,
      scansLastHour,
      stations: activeStations.length,
      progressRate: totalPossible > 0 ? totalScans / totalPossible : 0,
      avgStars: totalAttendees > 0 ? totalScans / totalAttendees : 0,
      medianCompletionMs,
    },
    stations: stationStats,
    distribution,
    staff: staffStats,
    registrationsByHour,
    feed: recentScans.map((scan) => ({
      id: scan.id,
      at: scan.createdAt.toISOString(),
      attendee: scan.attendee.name,
      code: scan.attendee.code,
      station: scan.station.name,
      emoji: scan.station.emoji,
      staff: scan.staff?.name ?? "—",
    })),
    recentAttendees: recentAttendees.map((a) => ({
      name: a.name,
      code: a.code,
      at: a.createdAt.toISOString(),
    })),
  };
}
