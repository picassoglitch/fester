"use server";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getStaffAttendeeProgress, syncCompletion, type StaffAttendeeProgress } from "@/lib/attendee";
import { normalizeCode } from "@/lib/codes";
import { canRecordStations, canRedeemPrizes } from "@/lib/roles";

export type ScanOutcome =
  | { ok: false; error: string }
  | {
      ok: true;
      status: "nuevo" | "repetido" | "premio";
      message: string;
      attendee: StaffAttendeeProgress;
    };

const NO_STATIONS = "No tienes permiso para registrar estaciones.";
const NO_PRIZES = "No tienes permiso para entregar premios.";

export async function lookupAttendee(rawCode: string): Promise<ScanOutcome> {
  const session = await requireSession();
  if (!canRecordStations(session.role)) return { ok: false, error: NO_STATIONS };
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Código vacío." };

  const attendee = await getStaffAttendeeProgress(code);
  if (!attendee) return { ok: false, error: `El código ${code} no existe.` };

  return { ok: true, status: "repetido", message: "Pase encontrado", attendee };
}

export async function recordScan(rawCode: string, stationId: string): Promise<ScanOutcome> {
  const session = await requireSession();
  if (!canRecordStations(session.role)) return { ok: false, error: NO_STATIONS };
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Código vacío." };
  if (!stationId) return { ok: false, error: "Selecciona una estación." };

  const [attendee, station] = await Promise.all([
    prisma.attendee.findUnique({ where: { code }, select: { id: true, name: true } }),
    prisma.station.findUnique({ where: { id: stationId }, select: { id: true, name: true, active: true } }),
  ]);

  if (!attendee) return { ok: false, error: `El código ${code} no existe.` };
  if (!station || !station.active) return { ok: false, error: "Esa estación ya no está activa." };

  // Insertamos directo y dejamos que el indice unico resuelva la carrera: si dos
  // personas escanean el mismo pase en la misma estacion a la vez, la segunda
  // cae en P2002 y la tratamos como repetido en vez de reventar.
  let repetido = false;
  try {
    await prisma.scan.create({
      data: { attendeeId: attendee.id, stationId: station.id, staffId: session.id },
    });
    await syncCompletion(attendee.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      repetido = true;
    } else {
      throw error;
    }
  }

  const progress = await getStaffAttendeeProgress(code);
  if (!progress) return { ok: false, error: "No pudimos leer el avance del pase." };

  if (repetido) {
    return {
      ok: true,
      status: "repetido",
      message: `${progress.name} ya tenía la estrella de ${station.name}.`,
      attendee: progress,
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
  if (!attendee.completedAt) {
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
