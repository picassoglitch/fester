import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Aforo del Frontón Bucareli acordado con Fester (solo invitados, no cuenta staff). */
export const CAPACITY = 450;

export type AccessKindValue = "ENTRY" | "EXIT";

export type EntryReason = "aforo-lleno";

export type EntryCheck =
  | { action: "enter" }
  | { action: "already" }
  | { action: "confirm"; reasons: EntryReason[] };

// Aldo 2026-11-05 — la lista de aprobados solo filtra la rifa; en la puerta solo el foro lleno pide "Dejar pasar".
export function checkEntry(input: {
  inside: boolean;
  insideCount: number;
  override: boolean;
}): EntryCheck {
  if (input.inside) return { action: "already" };
  const reasons: EntryReason[] = [];
  if (input.insideCount >= CAPACITY) reasons.push("aforo-lleno");
  if (reasons.length > 0 && !input.override) return { action: "confirm", reasons };
  return { action: "enter" };
}

export const INSIDE = { insideAt: { not: null } } as const;

/** Llegó al evento: tiene Entrada o alguna estrella (quien entró antes de que existiera la puerta). */
export const ARRIVED: Prisma.AttendeeWhereInput = {
  OR: [{ accesses: { some: { kind: "ENTRY" } } }, { scans: { some: {} } }],
};

export async function getAccessCounts() {
  const [inside, entered] = await Promise.all([
    prisma.attendee.count({ where: INSIDE }),
    prisma.attendee.count({ where: { accesses: { some: { kind: "ENTRY" } } } }),
  ]);
  return { inside, capacity: CAPACITY, entered };
}

export type AccessCounts = Awaited<ReturnType<typeof getAccessCounts>>;
