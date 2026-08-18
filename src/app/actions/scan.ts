"use server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { getAttendeeProgress, syncCompletion, type AttendeeProgress } from "@/lib/attendee";
import { normalizeCode } from "@/lib/codes";

export type ScanOutcome =
  | { ok: false; error: string }
  | {
      ok: true;
      status: "nuevo" | "repetido" | "premio";
      message: string;
      attendee: AttendeeProgress;
    };

export async function lookupAttendee(rawCode: string): Promise<ScanOutcome> {
  await requireSession();
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Código vacío." };

  const attendee = await getAttendeeProgress(code);
  if (!attendee) return { ok: false, error: `El código ${code} no existe.` };

  return { ok: true, status: "repetido", message: "Pase encontrado", attendee };
}

export async function recordScan(rawCode: string, stationId: string): Promise<ScanOutcome> {
  const session = await requireSession();
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Código vacío." };
  if (!stationId) return { ok: false, error: "Selecciona una estación." };

  const [attendee, station] = await Promise.all([
    prisma.attendee.findUnique({ where: { code }, select: { id: true, name: true } }),
    prisma.station.findUnique({ where: { id: stationId }, select: { id: true, name: true, active: true } }),
  ]);

  if (!attendee) return { ok: false, error: `El código ${code} no existe.` };
  if (!station || !station.active) return { ok: false, error: "Esa estación ya no está activa." };

  const existing = await prisma.scan.findUnique({
    where: { attendeeId_stationId: { attendeeId: attendee.id, stationId: station.id } },
    select: { id: true },
  });

  if (!existing) {
    await prisma.scan.create({
      data: { attendeeId: attendee.id, stationId: station.id, staffId: session.id },
    });
    await syncCompletion(attendee.id);
  }

  const progress = await getAttendeeProgress(code);
  if (!progress) return { ok: false, error: "No pudimos leer el avance del pase." };

  if (existing) {
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
  const code = normalizeCode(rawCode);

  const attendee = await prisma.attendee.findUnique({
    where: { code },
    select: { id: true, name: true, completedAt: true, redeemedAt: true },
  });
  if (!attendee) return { ok: false, error: `El código ${code} no existe.` };
  if (!attendee.completedAt) {
    return { ok: false, error: `${attendee.name} todavía no completa todas las estaciones.` };
  }

  if (!attendee.redeemedAt) {
    await prisma.attendee.update({
      where: { id: attendee.id },
      data: { redeemedAt: new Date(), redeemedById: session.id },
    });
  }

  const progress = await getAttendeeProgress(code);
  if (!progress) return { ok: false, error: "No pudimos leer el pase." };

  return {
    ok: true,
    status: attendee.redeemedAt ? "repetido" : "premio",
    message: attendee.redeemedAt
      ? `Ojo: el premio de ${progress.name} ya se había entregado.`
      : `Premio entregado a ${progress.name}.`,
    attendee: progress,
  };
}
