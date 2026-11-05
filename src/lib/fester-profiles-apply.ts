import type { PrismaClient } from "@prisma/client";
import type { ProfileRow } from "@/lib/fester-profiles";

/** Si casi nadie del Excel existe en la base, es el archivo equivocado: no se toca nada. */
const MIN_MATCH = 0.5;

export type ProfileApplyResult =
  | { ok: false; error: string }
  | { ok: true; updated: number; byEmail: number; notFound: string[]; perProfile: Record<string, number> };

// Guarda el perfil de Fester por código y, si el código no existe, por correo. No borra perfiles de quien no viene.
export async function applyFesterProfiles(
  db: PrismaClient,
  rows: readonly ProfileRow[],
  { apply }: { apply: boolean },
): Promise<ProfileApplyResult> {
  const codes = rows.flatMap((r) => (r.code ? [r.code] : []));
  const emails = rows.flatMap((r) => (r.email ? [r.email] : []));
  const [byCode, byEmail] = await Promise.all([
    db.attendee.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } }),
    db.attendee.findMany({ where: { email: { in: emails, mode: "insensitive" } }, select: { id: true, email: true } }),
  ]);
  const idByCode = new Map(byCode.map((a) => [a.code, a.id]));
  const idByEmail = new Map(byEmail.map((a) => [a.email?.toLowerCase() ?? "", a.id]));

  const idsByProfile = new Map<string, Set<string>>();
  const notFound: string[] = [];
  let viaEmail = 0;
  for (const row of rows) {
    const id = (row.code && idByCode.get(row.code)) || (row.email && idByEmail.get(row.email)) || null;
    if (!id) {
      notFound.push(row.code ?? row.email ?? "");
      continue;
    }
    if (!(row.code && idByCode.has(row.code))) viaEmail++;
    const set = idsByProfile.get(row.profile) ?? new Set<string>();
    set.add(id);
    idsByProfile.set(row.profile, set);
  }
  const matched = rows.length - notFound.length;
  if (matched < rows.length * MIN_MATCH) {
    return {
      ok: false,
      error: `Solo ${matched} de ${rows.length} filas del Excel tienen pase en el sistema. ¿Es el archivo correcto? No se cambió nada.`,
    };
  }

  if (apply) {
    await db.$transaction(
      [...idsByProfile].map(([festerProfile, ids]) =>
        db.attendee.updateMany({ where: { id: { in: [...ids] } }, data: { festerProfile } }),
      ),
    );
  }
  const perProfile = Object.fromEntries([...idsByProfile].map(([p, ids]) => [p, ids.size]));
  return { ok: true, updated: matched, byEmail: viaEmail, notFound, perProfile };
}
