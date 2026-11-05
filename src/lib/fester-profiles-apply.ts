import type { PrismaClient } from "@prisma/client";
import { braceletFor } from "@/lib/bracelet";
import type { ProfileRow } from "@/lib/fester-profiles";

/** Si casi nadie del Excel existe en la base, es el archivo equivocado: no se toca nada. */
const MIN_MATCH = 0.5;

export type ProfileApplyResult =
  | { ok: false; error: string }
  | {
      ok: true;
      updated: number;
      byEmail: number;
      notFound: string[];
      /** Correos que coinciden con más de un pase: no se adivina a quién. */
      ambiguous: string[];
      /** Personas con dos perfiles distintos en el Excel; se queda el que sí está en la tabla. */
      conflicts: string[];
      perProfile: Record<string, number>;
    };

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
  const idsByEmail = new Map<string, string[]>();
  for (const a of byEmail) {
    const key = a.email?.toLowerCase() ?? "";
    idsByEmail.set(key, [...(idsByEmail.get(key) ?? []), a.id]);
  }

  const profileById = new Map<string, string>();
  const notFound: string[] = [];
  const ambiguous: string[] = [];
  const conflicts: string[] = [];
  const viaEmail = new Set<string>();
  for (const row of rows) {
    let id = row.code ? idByCode.get(row.code) : undefined;
    if (!id && row.email) {
      const ids = idsByEmail.get(row.email) ?? [];
      if (ids.length > 1) {
        ambiguous.push(row.email);
        continue;
      }
      id = ids[0];
      if (id) viaEmail.add(id);
    }
    if (!id) {
      notFound.push(row.code ?? row.email ?? "");
      continue;
    }
    const prev = profileById.get(id);
    if (prev !== undefined && prev !== row.profile) {
      conflicts.push(row.code ?? row.email ?? id);
      if (braceletFor(prev) || !braceletFor(row.profile)) continue;
    }
    profileById.set(id, row.profile);
  }
  const idsByProfile = new Map<string, string[]>();
  for (const [id, profile] of profileById) idsByProfile.set(profile, [...(idsByProfile.get(profile) ?? []), id]);
  const matched = rows.length - notFound.length - ambiguous.length;
  if (matched < rows.length * MIN_MATCH) {
    return {
      ok: false,
      error: `Solo ${matched} de ${rows.length} filas del Excel tienen pase en el sistema. ¿Es el archivo correcto? No se cambió nada.`,
    };
  }

  if (apply) {
    await db.$transaction(
      [...idsByProfile].map(([festerProfile, ids]) =>
        db.attendee.updateMany({ where: { id: { in: ids } }, data: { festerProfile } }),
      ),
    );
  }
  const perProfile = Object.fromEntries([...idsByProfile].map(([p, ids]) => [p, ids.length]));
  return { ok: true, updated: profileById.size, byEmail: viaEmail.size, notFound, ambiguous, conflicts, perProfile };
}
