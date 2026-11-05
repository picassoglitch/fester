"use server";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getStaffAttendeeProgress, syncCompletion, type StaffAttendeeProgress } from "@/lib/attendee";
import { normalizeCode } from "@/lib/codes";
import { searchAttendeesByName } from "@/lib/attendee-search";
import type { NameMatch } from "@/lib/name-search";
import { canRecordStations, canRedeemPrizes } from "@/lib/roles";
import { doorKindOf } from "@/lib/stations";
import { CAPACITY, checkEntry, INSIDE, type EntryReason } from "@/lib/access";

export type ScanOutcome =
  | { ok: false; error: string }
  | {
      ok: true;
      status: "nuevo" | "repetido" | "premio" | "entrada" | "salida" | "ya-afuera" | "confirmar";
      message: string;
      attendee: StaffAttendeeProgress;
      /** Personas dentro del foro despues de este escaneo (Registro y Salida). */
      inside?: number;
      /** Por que "confirmar": el staff decide con "Dejar pasar". */
      reasons?: EntryReason[];
    };

const NO_STATIONS = "No tienes permiso para registrar estaciones.";
const NO_PRIZES = "No tienes permiso para entregar premios.";

/** Quien no trae su QR: el staff lo busca por nombre (sin correo ni teléfono). */
export async function findAttendeesByName(query: string): Promise<NameMatch[]> {
  const session = await requireSession();
  if (!canRecordStations(session.role) && !canRedeemPrizes(session.role)) return [];
  return searchAttendeesByName(query);
}

export async function lookupAttendee(rawCode: string): Promise<ScanOutcome> {
  const session = await requireSession();
  if (!canRecordStations(session.role)) return { ok: false, error: NO_STATIONS };
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Código vacío." };

  const attendee = await getStaffAttendeeProgress(code);
  if (!attendee) return { ok: false, error: `El código ${code} no existe.` };

  return { ok: true, status: "repetido", message: "Pase encontrado", attendee };
}

export async function recordScan(
  rawCode: string,
  stationId: string,
  override = false,
): Promise<ScanOutcome> {
  const session = await requireSession();
  if (!canRecordStations(session.role)) return { ok: false, error: NO_STATIONS };
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Código vacío." };
  if (!stationId) return { ok: false, error: "Selecciona una estación." };

  const [attendee, station] = await Promise.all([
    prisma.attendee.findUnique({
      where: { code },
      select: { id: true, name: true, insideAt: true },
    }),
    prisma.station.findUnique({ where: { id: stationId }, select: { id: true, name: true, active: true } }),
  ]);

  if (!attendee) return { ok: false, error: `El código ${code} no existe.` };
  if (!station || !station.active) return { ok: false, error: "Esa estación ya no está activa." };
  const door = doorKindOf(station.name);

  if (door === "EXIT") {
    // Salida no da estrella: solo descuenta del aforo.
    const left = await prisma.$transaction(async (tx) => {
      const moved = await tx.attendee.updateMany({
        where: { id: attendee.id, insideAt: { not: null } },
        data: { insideAt: null },
      });
      if (moved.count === 1) {
        await tx.access.create({ data: { attendeeId: attendee.id, kind: "EXIT", staffId: session.id } });
      }
      return moved.count === 1;
    });
    const [progress, inside] = await Promise.all([
      getStaffAttendeeProgress(code),
      prisma.attendee.count({ where: INSIDE }),
    ]);
    if (!progress) return { ok: false, error: "No pudimos leer el avance del pase." };
    return {
      ok: true,
      status: left ? "salida" : "ya-afuera",
      message: left ? `Salida de ${progress.name}.` : `${progress.name} no tenía entrada registrada.`,
      attendee: progress,
      inside,
    };
  }

  let entered = false;
  if (door === "ENTRY" && attendee.insideAt === null) {
    const insideCount = await prisma.attendee.count({ where: INSIDE });
    const check = checkEntry({ inside: false, insideCount, override });
    if (check.action === "confirm") {
      const progress = await getStaffAttendeeProgress(code);
      if (!progress) return { ok: false, error: "No pudimos leer el avance del pase." };
      return {
        ok: true,
        status: "confirmar",
        message: "Revisar antes de dejar pasar",
        attendee: progress,
        inside: insideCount,
        reasons: check.reasons,
      };
    }
    const forced = override && insideCount >= CAPACITY;
    entered = await prisma.$transaction(async (tx) => {
      const moved = await tx.attendee.updateMany({
        where: { id: attendee.id, insideAt: null },
        data: { insideAt: new Date() },
      });
      if (moved.count === 1) {
        await tx.access.create({
          data: { attendeeId: attendee.id, kind: "ENTRY", staffId: session.id, override: forced },
        });
      }
      return moved.count === 1;
    });
  }

  // Insertamos directo y dejamos que el indice unico resuelva la carrera: si dos
  // personas escanean el mismo pase en la misma estacion a la vez, la segunda
  // cae en P2002 y la tratamos como repetido en vez de reventar.
  let repetido = false;
  try {
    await prisma.scan.create({
      data: { attendeeId: attendee.id, stationId: station.id, staffId: session.id },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      repetido = true;
    } else {
      throw error;
    }
  }
  // También en "repetido": si el sync falló tras guardar la estrella o se apagó una
  // estación, el pase quedaba sin completar para siempre (mesa de premios, 2026-11-05).
  await syncCompletion(attendee.id);

  const [progress, inside] = await Promise.all([
    getStaffAttendeeProgress(code),
    door === "ENTRY" ? prisma.attendee.count({ where: INSIDE }) : Promise.resolve(undefined),
  ]);
  if (!progress) return { ok: false, error: "No pudimos leer el avance del pase." };

  // Volver a entrar despues de salir: la estrella ya estaba, pero la entrada si cuenta.
  if (entered && repetido) {
    return { ok: true, status: "entrada", message: `Entrada de ${progress.name}.`, attendee: progress, inside };
  }

  if (repetido) {
    return {
      ok: true,
      status: "repetido",
      message: `${progress.name} ya tenía la estrella de ${station.name}.`,
      attendee: progress,
      inside,
    };
  }

  return {
    ok: true,
    status: progress.pending === 0 ? "premio" : "nuevo",
    message:
      progress.pending === 0
        ? `¡${progress.name} completó el recorrido! Pasa al módulo de premios.`
        : `Estrella registrada en ${station.name}.`,
    attendee: progress,
    inside,
  };
}

export async function redeemPrize(rawCode: string): Promise<ScanOutcome> {
  const session = await requireSession();
  if (!canRedeemPrizes(session.role)) return { ok: false, error: NO_PRIZES };
  const code = normalizeCode(rawCode);

  const attendee = await prisma.attendee.findUnique({
    where: { code },
    select: { id: true, name: true, completedAt: true, redeemedAt: true },
  });
  if (!attendee) return { ok: false, error: `El código ${code} no existe.` };
  // Recalcula antes de rechazar: tiene todas las estrellas pero completedAt no se marcó.
  const completedAt = attendee.completedAt ?? (await syncCompletion(attendee.id));
  if (!completedAt) {
    return { ok: false, error: `${attendee.name} todavía no completa todas las estaciones.` };
  }

  // Update condicional: si dos personas entregan el mismo premio a la vez, solo
  // una cambia la fila y la otra ve "ya se habia entregado".
  const { count } = await prisma.attendee.updateMany({
    where: { id: attendee.id, redeemedAt: null, completedAt: { not: null } },
    data: { redeemedAt: new Date(), redeemedById: session.id },
  });
  const delivered = count === 1;

  const progress = await getStaffAttendeeProgress(code);
  if (!progress) return { ok: false, error: "No pudimos leer el pase." };
  if (!delivered && !progress.redeemedAt) {
    // count 0 sin entrega previa: el recorrido se reabrio entre la lectura y el update.
    return { ok: false, error: `${progress.name} todavía no completa todas las estaciones.` };
  }

  return {
    ok: true,
    status: delivered ? "premio" : "repetido",
    message: delivered
      ? `Premio entregado a ${progress.name}.`
      : `Ojo: el premio de ${progress.name} ya se había entregado.`,
    attendee: progress,
  };
}
