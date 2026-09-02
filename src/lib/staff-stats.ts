import { prisma } from "@/lib/db";

export type StaffStats = Awaited<ReturnType<typeof getStaffStats>>;

/**
 * Datos que le sirven a quien está parado en una estación: cómo va el evento,
 * qué tan movida está cada estación y a quién se acaba de escanear.
 */
export async function getStaffStats(staffId: string) {
  const lastHour = new Date(Date.now() - 60 * 60 * 1000);

  const [
    stations,
    attendees,
    completed,
    redeemed,
    scansTotal,
    scansLastHour,
    myScans,
    byStation,
    recent,
  ] = await Promise.all([
    prisma.station.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, emoji: true },
    }),
    prisma.attendee.count(),
    prisma.attendee.count({ where: { completedAt: { not: null } } }),
    prisma.attendee.count({ where: { redeemedAt: { not: null } } }),
    prisma.scan.count(),
    prisma.scan.count({ where: { createdAt: { gte: lastHour } } }),
    prisma.scan.count({ where: { staffId } }),
    prisma.scan.groupBy({ by: ["stationId"], _count: { _all: true } }),
    prisma.scan.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        createdAt: true,
        attendee: { select: { name: true, code: true } },
        station: { select: { name: true, emoji: true } },
        staff: { select: { name: true } },
      },
    }),
  ]);

  const countByStation = new Map(byStation.map((g) => [g.stationId, g._count._all]));
  const busiest = Math.max(1, ...stations.map((s) => countByStation.get(s.id) ?? 0));

  return {
    attendees,
    completed,
    redeemed,
    pendingPrizes: completed - redeemed,
    scansTotal,
    scansLastHour,
    myScans,
    completionRate: attendees > 0 ? Math.round((completed / attendees) * 100) : 0,
    stations: stations.map((station) => ({
      ...station,
      scans: countByStation.get(station.id) ?? 0,
      share: Math.round(((countByStation.get(station.id) ?? 0) / busiest) * 100),
    })),
    recent: recent.map((scan) => ({
      id: scan.id,
      at: scan.createdAt.toISOString(),
      name: scan.attendee.name,
      code: scan.attendee.code,
      station: `${scan.station.emoji} ${scan.station.name}`,
      staff: scan.staff?.name ?? null,
    })),
  };
}
