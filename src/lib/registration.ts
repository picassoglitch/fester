// Aldo 2026-11-05 — web y puerta validan nombre, correo y puesto con las mismas reglas.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/codes";
import { OTHER_OPTION, POSITIONS } from "@/lib/event";

export type FieldError = { error: string };

type Db = Prisma.TransactionClient;

export function pick(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// "Otro" se guarda como "Otro: <texto>" para que siga siendo filtrable.
export function withDetail(value: string, detail: string): string | FieldError {
  if (value !== OTHER_OPTION) return value;
  if (detail.length < 2) return { error: "Escribe tu respuesta en el campo de \"Otro\"." };
  if (detail.length > 60) return { error: "La respuesta de \"Otro\" es demasiado larga." };
  return `${OTHER_OPTION}: ${detail}`;
}

export function nameError(name: string): string | null {
  if (name.length < 2) return "Escribe tu nombre completo.";
  if (name.length > 80) return "El nombre es demasiado largo.";
  return null;
}

export function emailError(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : "El correo no parece válido.";
}

/** El puesto viene de un <select>: se valida contra la lista para no guardar valores manipulados. */
export function parsePosition(choice: string, otherDetail: string): string | FieldError {
  if (!POSITIONS.includes(choice as (typeof POSITIONS)[number])) {
    return { error: "Selecciona tu puesto o cargo." };
  }
  return withDetail(choice, otherDetail);
}

/** Codigo de pase que no exista todavia; null si no se encontro uno libre. */
export async function generateUniqueCode(db: Db = prisma): Promise<string | null> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateCode();
    const taken = await db.attendee.findUnique({
      where: { code: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return null;
}

/** Crea el pase con un codigo nuevo; null si no se pudo generar el codigo. */
export async function createAttendee(
  data: Omit<Prisma.AttendeeCreateInput, "code">,
  db: Db = prisma,
): Promise<{ id: string; code: string } | null> {
  const code = await generateUniqueCode(db);
  if (!code) return null;
  return db.attendee.create({ data: { ...data, code }, select: { id: true, code: true } });
}
