/**
 * Perfil de cada asistente para agrupar en el panel: es su "Puesto / Cargo".
 * Quien eligio "Otro" y escribio que es estudiante cuenta como "Estudiante"
 * (la opcion se agrego despues de abrir el registro). Sin Prisma: lo usan
 * tambien componentes de cliente (mapa, panel).
 */
import type { Prisma } from "@prisma/client";
import { OTHER_OPTION, POSITIONS } from "@/lib/event";

export const NO_PROFILE = "Sin dato";
export const STUDENT_PROFILE = "Estudiante";

/** Los perfiles en el orden del formulario, mas "Sin dato" al final. */
export const PROFILES: readonly string[] = [...POSITIONS, NO_PROFILE];

/** Fragmentos que delatan a un estudiante en la respuesta libre de "Otro". */
const STUDENT_HINTS = ["estudiant", "alumn"];

/** Etiquetas cortas para chips, barras y el mapa. */
const SHORT_LABELS: Record<string, string> = {
  "Proveedor de materiales de construcción": "Proveedor",
  "Técnico de la construcción": "Téc. construcción",
  "Técnico de impermeabilización": "Téc. impermeabilización",
  "Inspector de obras": "Inspector",
};

/**
 * Un color por perfil, legible sobre el azul del panel. El orden sigue a
 * PROFILES; "Otro" y "Sin dato" van en grises.
 */
const COLORS: Record<string, string> = {
  Arquitecto: "#4fc3f7",
  "Albañil": "#ff8a65",
  Carpintero: "#a1887f",
  Contratista: "#ffd54f",
  DIY: "#f06292",
  "Inspector de obras": "#9575cd",
  "Maestro de obra": "#ff5252",
  "Proveedor de materiales de construcción": "#4db6ac",
  "Técnico de la construcción": "#aed581",
  "Técnico de impermeabilización": "#64b5f6",
  Estudiante: "#ba68c8",
  Otro: "#cfd8dc",
  [NO_PROFILE]: "#78909c",
};

function isStudentText(text: string): boolean {
  const lower = text.toLowerCase();
  return STUDENT_HINTS.some((hint) => lower.includes(hint));
}

/** El perfil de un "Puesto" tal como quedo guardado en la base. */
export function profileOf(position: string | null | undefined): string {
  const value = position?.trim();
  if (!value) return NO_PROFILE;
  if (isStudentText(value)) return STUDENT_PROFILE;
  if ((POSITIONS as readonly string[]).includes(value)) return value;
  // "Otro: <texto>" y cualquier valor fuera del catalogo.
  return OTHER_OPTION;
}

export function profileLabel(profile: string): string {
  return SHORT_LABELS[profile] ?? profile;
}

export function profileColor(profile: string): string {
  return COLORS[profile] ?? COLORS[OTHER_OPTION];
}

export function parseProfile(value: unknown): string | null {
  return typeof value === "string" && PROFILES.includes(value) ? value : null;
}

/** Filtro de Prisma que devuelve exactamente a quienes profileOf() pone en ese perfil. */
export function profileWhere(profile: string): Prisma.AttendeeWhereInput {
  const student: Prisma.AttendeeWhereInput = {
    OR: STUDENT_HINTS.map((hint) => ({ position: { contains: hint, mode: "insensitive" } })),
  };
  if (profile === STUDENT_PROFILE) return student;
  if (profile === NO_PROFILE) return { OR: [{ position: null }, { position: { equals: "" } }] };

  const named = POSITIONS.filter((p) => p !== OTHER_OPTION && p !== STUDENT_PROFILE);
  if (profile === OTHER_OPTION) {
    return {
      AND: [
        { position: { not: null } },
        { position: { not: "" } },
        { position: { notIn: [...named] } },
        { NOT: student },
      ],
    };
  }
  return { position: profile };
}

/** Cuenta por perfil, en el orden de PROFILES, sin los perfiles vacios. */
export function countByProfile(
  rows: readonly { position: string | null; count: number }[],
): { profile: string; count: number }[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const profile = profileOf(row.position);
    totals.set(profile, (totals.get(profile) ?? 0) + row.count);
  }
  return PROFILES.filter((p) => (totals.get(p) ?? 0) > 0).map((profile) => ({
    profile,
    count: totals.get(profile)!,
  }));
}
