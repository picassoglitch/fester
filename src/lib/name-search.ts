// Aldo 2026-11-05 — quien llega sin su QR se busca por nombre en la estación.
export const MIN_SEARCH_CHARS = 3;

export type NameMatch = { code: string; name: string; company: string | null; state: string | null };

/** Palabras sin acentos ni comodines de LIKE; vacío si la búsqueda es muy corta. */
export function searchPatterns(query: string): string[] {
  const clean = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[%_\\]/g, " ").trim();
  if (clean.replace(/\s/g, "").length < MIN_SEARCH_CHARS) return [];
  return clean.split(/\s+/).map((word) => `%${word}%`);
}
