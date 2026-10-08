import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./db";

/**
 * Estaciones de ejemplo: SOLO para el seed y para "npm run db:stations" en una
 * base vacia. La lista real es la de /admin/estaciones (tabla Station): el
 * pase, el escaner, el panel, el export y el premio leen getActiveStations().
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

export type ActiveStation = { id: string; name: string; emoji: string; order: number };

/**
 * Las estaciones que cuentan hoy, en el orden del admin. Las estrellas
 * necesarias para el premio son getActiveStations().length, nunca un numero fijo.
 */
export function getActiveStations(client: PrismaClient = prisma): Promise<ActiveStation[]> {
  return client.station.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, emoji: true, order: true },
  });
}

/**
 * Crea las estaciones de DEFAULT_STATIONS que no existan (por nombre, sin
 * importar mayusculas), al final del orden actual. No toca las que ya existen:
 * ni las desactiva, ni las reactiva, ni les cambia orden o emoji. Las creadas
 * en el admin se quedan como estan.
 */
export async function ensureDefaultStations(client: PrismaClient = prisma): Promise<string[]> {
  const existentes = await client.station.findMany({ select: { name: true, order: true } });
  const nombres = new Set(existentes.map((e) => e.name.toLowerCase()));
  let order = Math.max(0, ...existentes.map((e) => e.order));
  const creadas: string[] = [];

  for (const estacion of DEFAULT_STATIONS) {
    if (nombres.has(estacion.name.toLowerCase())) continue;
    order += 1;
    await client.station.create({ data: { ...estacion, order, active: true } });
    creadas.push(estacion.name);
  }
  return creadas;
}

/**
 * Marca completedAt a quien ya tiene escaneadas todas las estaciones activas,
 * en una sola sentencia. La fecha es la de su ultimo escaneo en una estacion
 * activa (cuando de verdad termino), no la hora en que el admin quito la
 * estacion. Solo pone fechas: nunca borra completedAt ni toca redeemedAt /
 * redeemedById. Sin estaciones activas no marca a nadie.
 * Devuelve cuantas personas quedaron completas con esta llamada.
 */
export function markCompletedAttendees(client: PrismaClient | Prisma.TransactionClient = prisma) {
  return client.$executeRaw`
    update "Attendee" a
       set "completedAt" = (
             select max(sc."createdAt")
               from "Scan" sc
               join "Station" s on s.id = sc."stationId"
              where s.active and sc."attendeeId" = a.id
           )
     where a."completedAt" is null
       and exists (select 1 from "Station" s where s.active)
       and not exists (
         select 1
           from "Station" s
          where s.active
            and not exists (
              select 1 from "Scan" sc where sc."attendeeId" = a.id and sc."stationId" = s.id
            )
       )`;
}

export type StationChangeImpact = {
  /** Ya completaron: siguen completos pase lo que pase con las estaciones. */
  completed: number;
  /** Tienen premio entregado (subconjunto de los que alguna vez completaron). */
  redeemed: number;
  /** Aun no completan: al activar una estacion, tambien la van a necesitar. */
  inProgress: number;
  /** Por estacion activa: cuantos completarian si se desactiva o borra. */
  completesWithout: Record<string, number>;
};

/** Lo que el admin ve antes de confirmar activar, desactivar o borrar una estacion. */
export async function getStationChangeImpact(client: PrismaClient = prisma): Promise<StationChangeImpact> {
  const [completed, redeemed, inProgress, activeCount, rows] = await Promise.all([
    client.attendee.count({ where: { completedAt: { not: null } } }),
    client.attendee.count({ where: { redeemedAt: { not: null } } }),
    client.attendee.count({ where: { completedAt: null } }),
    client.station.count({ where: { active: true } }),
    // Personas en curso a las que solo les falta una estacion activa, agrupadas por esa estacion.
    client.$queryRaw<{ stationId: string; people: number }[]>`
      select missing."stationId", count(*)::int as people
        from (
          select a.id, min(s.id) as "stationId"
            from "Attendee" a
            join "Station" s on s.active
           where a."completedAt" is null
             and not exists (
               select 1 from "Scan" sc where sc."attendeeId" = a.id and sc."stationId" = s.id
             )
           group by a.id
          having count(*) = 1
        ) missing
       group by missing."stationId"`,
  ]);

  // Sin estaciones activas nadie completa, asi que quitar la ultima no marca a nadie.
  const completesWithout =
    activeCount > 1 ? Object.fromEntries(rows.map((r) => [r.stationId, r.people])) : {};
  return { completed, redeemed, inProgress, completesWithout };
}
