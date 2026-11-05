import { prisma } from "@/lib/db";

/** Aforo del Frontón Bucareli acordado con Fester (solo invitados, no cuenta staff). */
export const CAPACITY = 450;

export type AccessKindValue = "ENTRY" | "EXIT";

export type EntryReason = "no-aprobado" | "aforo-lleno";

export type EntryCheck =
  | { action: "enter" }
  | { action: "already" }
  | { action: "confirm"; reasons: EntryReason[] };

// Junta Fester 2026-11-04 — no aprobado o foro lleno no bloquea: el staff decide con "Dejar pasar".
export function checkEntry(input: {
  approved: boolean;
  inside: boolean;
  insideCount: number;
  override: boolean;
}): EntryCheck {
  if (input.inside) return { action: "already" };
  const reasons: EntryReason[] = [];
  if (!input.approved) reasons.push("no-aprobado");
  if (input.insideCount >= CAPACITY) reasons.push("aforo-lleno");
  if (reasons.length > 0 && !input.override) return { action: "confirm", reasons };
  return { action: "enter" };
}

export const INSIDE = { insideAt: { not: null } } as const;

export async function getAccessCounts() {
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const [inside, entered, entries15, exits15, overrides] = await Promise.all([
    prisma.attendee.count({ where: INSIDE }),
    prisma.attendee.count({ where: { accesses: { some: { kind: "ENTRY" } } } }),
    prisma.access.count({ where: { kind: "ENTRY", createdAt: { gte: since } } }),
    prisma.access.count({ where: { kind: "EXIT", createdAt: { gte: since } } }),
    prisma.access.count({ where: { kind: "ENTRY", override: true } }),
  ]);
  return { inside, capacity: CAPACITY, entered, entries15, exits15, overrides };
}

export type AccessCounts = Awaited<ReturnType<typeof getAccessCounts>>;
