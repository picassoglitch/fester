// Fester 2026-11-05 — tabla de equivalencia de perfiles (lámina 11B): el perfil de su base define el brazalete.

import { OTHER_OPTION } from "@/lib/event";
import { NO_PROFILE, profileOf, STUDENT_PROFILE } from "@/lib/profiles";

export type BraceletColor = "ROJO" | "BLANCO" | "AZUL";
export type BraceletCategory = "Aplicador" | "Estudiante" | "Profesionista";
export type Bracelet = {
  color: BraceletColor;
  category: BraceletCategory;
  /** "puesto" = no hay perfil de Fester que sirva; se usó el puesto de su registro. */
  source?: "fester" | "puesto";
};

const APLICADOR: Bracelet = { color: "ROJO", category: "Aplicador" };
const ESTUDIANTE: Bracelet = { color: "BLANCO", category: "Estudiante" };
const PROFESIONISTA: Bracelet = { color: "AZUL", category: "Profesionista" };

function key(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
}

const TABLE = new Map<string, Bracelet>(
  (
    [
      ["Aplicador", APLICADOR],
      ["Distribuidor-ventas", APLICADOR],
      ["DIY", APLICADOR],
      ["Inspector de obras", APLICADOR],
      ["Ventas", APLICADOR],
      ["Estudiante", ESTUDIANTE],
      ["Profesionista", PROFESIONISTA],
      ["Constructora", PROFESIONISTA],
      ["Asociación CMIC", PROFESIONISTA],
      ["Otro: Administración de empresas y contabilidad", PROFESIONISTA],
      ["Bienes raíces", PROFESIONISTA],
      ["Distribuidor automotriz", PROFESIONISTA],
      ["inmobiliario", PROFESIONISTA],
    ] as const
  ).map(([profile, bracelet]) => [key(profile), bracelet]),
);

/** null = el perfil no está en la tabla de Fester (o no hay perfil): el staff revisa. */
export function braceletFor(profile: string | null | undefined): Bracelet | null {
  if (!profile) return null;
  return TABLE.get(key(profile)) ?? null;
}

// Aldo 2026-11-05 — sin perfil de Fester se usa el puesto, como lo clasificó Fester en su Excel:
// Arquitecto = Profesionista, Estudiante = Estudiante, el resto del catálogo = Aplicador; "Otro" se revisa.
export function braceletForPosition(position: string | null | undefined): Bracelet | null {
  const profile = profileOf(position);
  if (profile === "Arquitecto") return PROFESIONISTA;
  if (profile === STUDENT_PROFILE) return ESTUDIANTE;
  if (profile === OTHER_OPTION || profile === NO_PROFILE) return null;
  return APLICADOR;
}

/** Perfil de Fester primero; si no sirve, el puesto del registro. */
export function braceletOf(festerProfile: string | null | undefined, position: string | null | undefined): Bracelet | null {
  const fromFester = braceletFor(festerProfile);
  if (fromFester) return { ...fromFester, source: "fester" };
  const fromPosition = braceletForPosition(position);
  return fromPosition ? { ...fromPosition, source: "puesto" } : null;
}
