import { prisma } from "@/lib/db";
import { getActiveStations } from "@/lib/stations";

export type StationProgress = {
  id: string;
  name: string;
  emoji: string;
  order: number;
  visitedAt: string | null;
};

/** Detalle completo del pase. Solo para la cuenta del asistente y el admin. */
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

/** Lo que ve el staff al escanear: sin correo ni telefono. */
export type StaffAttendeeProgress = Omit<AttendeeProgress, "id" | "email" | "phone" | "createdAt">;

/**
 * Lo unico que puede salir sin sesion (pagina y API del pase). El codigo viaja
 * en QRs y capturas de pantalla, asi que aqui no van nombre completo, correo,
 * telefono, ids internos ni el nombre del staff que entrego el premio.
 */
export type PublicStationProgress = {
  key: number;
  name: string;
  emoji: string;
  order: number;
  visitedAt: string | null;
};

export type PublicPassProgress = {
  code: string;
  firstName: string;
  completedAt: string | null;
  redeemedAt: string | null;
  stars: number;
  total: number;
  pending: number;
  stations: PublicStationProgress[];
};

async function loadStationProgress(attendeeId: string): Promise<StationProgress[]> {
  const [stations, scans] = await Promise.all([
    getActiveStations(),
    prisma.scan.findMany({
      where: { attendeeId },
      select: { stationId: true, createdAt: true },
    }),
  ]);
  const scanByStation = new Map(scans.map((s) => [s.stationId, s.createdAt]));
  return stations.map((station) => ({
    id: station.id,
    name: station.name,
    emoji: station.emoji,
    order: station.order,
    visitedAt: scanByStation.get(station.id)?.toISOString() ?? null,
  }));
}

function countStars(stations: { visitedAt: string | null }[]) {
  const stars = stations.filter((s) => s.visitedAt).length;
  return { stars, total: stations.length, pending: stations.length - stars };
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

export async function getAttendeeProgress(code: string): Promise<AttendeeProgress | null> {
  const attendee = await prisma.attendee.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      completedAt: true,
      redeemedAt: true,
      redeemedBy: { select: { name: true } },
    },
  });
  if (!attendee) return null;

  const stations = await loadStationProgress(attendee.id);

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
    ...countStars(stations),
    stations,
  };
}

export async function getStaffAttendeeProgress(code: string): Promise<StaffAttendeeProgress | null> {
  const attendee = await prisma.attendee.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      name: true,
      completedAt: true,
      redeemedAt: true,
      redeemedBy: { select: { name: true } },
    },
  });
  if (!attendee) return null;

  const stations = await loadStationProgress(attendee.id);

  return {
    code: attendee.code,
    name: attendee.name,
    completedAt: attendee.completedAt?.toISOString() ?? null,
    redeemedAt: attendee.redeemedAt?.toISOString() ?? null,
    redeemedByName: attendee.redeemedBy?.name ?? null,
    ...countStars(stations),
    stations,
  };
}

export async function getPublicPassProgress(code: string): Promise<PublicPassProgress | null> {
  const attendee = await prisma.attendee.findUnique({
    where: { code },
    select: { id: true, code: true, name: true, completedAt: true, redeemedAt: true },
  });
  if (!attendee) return null;

  const stations = await loadStationProgress(attendee.id);

  return toPublicPass(attendee, stations);
}

/** Separado del loader para poder probar que la forma publica no filtra campos. */
export function toPublicPass(
  attendee: { code: string; name: string; completedAt: Date | null; redeemedAt: Date | null },
  stations: StationProgress[],
): PublicPassProgress {
  const publicStations = stations.map((station, index) => ({
    key: index,
    name: station.name,
    emoji: station.emoji,
    order: station.order,
    visitedAt: station.visitedAt,
  }));
  return {
    code: attendee.code,
    firstName: firstNameOf(attendee.name),
    completedAt: attendee.completedAt?.toISOString() ?? null,
    redeemedAt: attendee.redeemedAt?.toISOString() ?? null,
    ...countStars(publicStations),
    stations: publicStations,
  };
}

/**
 * Marca completedAt cuando el asistente ya tiene todas las estaciones activas.
 * Se llama despues de cada escaneo.
 *
 * Completo una vez, completo siempre: agregar o reactivar estaciones nunca
 * borra completedAt. Solo "Revertir escaneo" del admin reabre un pase, y lo
 * pide con { reopen: true }. Nunca toca redeemedAt / redeemedById.
 */
export async function syncCompletion(
  attendeeId: string,
  options: { reopen?: boolean } = {},
): Promise<Date | null> {
  const [activeStations, attendee] = await Promise.all([
    getActiveStations(),
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
  if (!complete && attendee.completedAt && options.reopen) {
    await prisma.attendee.update({ where: { id: attendeeId }, data: { completedAt: null } });
    return null;
  }
  return attendee.completedAt;
}
