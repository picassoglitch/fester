"use server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { normalizeCode } from "@/lib/codes";
import { canRecordStations } from "@/lib/roles";
import { CAPACITY, checkEntry, INSIDE, type AccessKindValue } from "@/lib/access";

export type AccessAttendee = { name: string; code: string; company: string | null; approved: boolean };

export type AccessOutcome =
  | { ok: false; error: string }
  | {
      ok: true;
      status: "entrada" | "salida" | "ya-dentro" | "ya-afuera" | "confirmar";
      reasons?: ("no-aprobado" | "aforo-lleno")[];
      attendee: AccessAttendee;
      inside: number;
    };

export async function recordAccess(
  rawCode: string,
  kind: AccessKindValue,
  override = false,
): Promise<AccessOutcome> {
  const session = await requireSession();
  if (!canRecordStations(session.role)) return { ok: false, error: "No tienes permiso para registrar accesos." };
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Código vacío." };
  if (kind !== "ENTRY" && kind !== "EXIT") return { ok: false, error: "Elige Entrada o Salida." };

  const row = await prisma.attendee.findUnique({
    where: { code },
    select: { id: true, name: true, code: true, company: true, approved: true, insideAt: true },
  });
  if (!row) return { ok: false, error: `El código ${code} no existe.` };
  const attendee: AccessAttendee = { name: row.name, code: row.code, company: row.company, approved: row.approved };

  if (kind === "EXIT") {
    // Condicional: dos lectores a la vez solo restan una persona.
    const { count } = await prisma.attendee.updateMany({
      where: { id: row.id, insideAt: { not: null } },
      data: { insideAt: null },
    });
    if (count === 1) {
      await prisma.access.create({ data: { attendeeId: row.id, kind: "EXIT", staffId: session.id } });
    }
    const inside = await prisma.attendee.count({ where: INSIDE });
    return { ok: true, status: count === 1 ? "salida" : "ya-afuera", attendee, inside };
  }

  const insideCount = await prisma.attendee.count({ where: INSIDE });
  const check = checkEntry({ approved: row.approved, inside: row.insideAt !== null, insideCount, override });
  if (check.action === "already") return { ok: true, status: "ya-dentro", attendee, inside: insideCount };
  if (check.action === "confirm") {
    return { ok: true, status: "confirmar", reasons: check.reasons, attendee, inside: insideCount };
  }

  const { count } = await prisma.attendee.updateMany({
    where: { id: row.id, insideAt: null },
    data: { insideAt: new Date() },
  });
  if (count === 1) {
    const forced = override && (!row.approved || insideCount >= CAPACITY);
    await prisma.access.create({
      data: { attendeeId: row.id, kind: "ENTRY", staffId: session.id, override: forced },
    });
  }
  const inside = await prisma.attendee.count({ where: INSIDE });
  return { ok: true, status: count === 1 ? "entrada" : "ya-dentro", attendee, inside };
}
