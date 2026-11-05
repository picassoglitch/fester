// Fester 2026-11-05 — tabla de equivalencia de perfiles (lámina 11B): el perfil de su base define el brazalete.

export type BraceletColor = "ROJO" | "BLANCO" | "AZUL";
export type BraceletCategory = "Aplicador" | "Estudiante" | "Profesionista";
export type Bracelet = { color: BraceletColor; category: BraceletCategory };

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
