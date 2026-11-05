import { prisma } from "@/lib/db";
import { searchPatterns, type NameMatch } from "@/lib/name-search";

const LIMIT = 8;
const FROM = "áàäâéèëêíìïîóòöôúùüûñ";
const TO = "aaaaeeeeiiiioooouuuun";

/** Cada palabra debe aparecer en el nombre, en cualquier orden y sin importar acentos. */
export async function searchAttendeesByName(query: string): Promise<NameMatch[]> {
  const patterns = searchPatterns(query);
  if (patterns.length === 0) return [];
  return prisma.$queryRaw<NameMatch[]>`
    SELECT code, name, company, state FROM "Attendee"
    WHERE translate(lower(name), ${FROM}, ${TO}) LIKE ALL(${patterns}::text[])
    ORDER BY name ASC
    LIMIT ${LIMIT}`;
}
