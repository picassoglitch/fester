import type { PrismaClient } from "@prisma/client";
import type { ApprovedRow } from "@/lib/approved";

/** Si casi nadie del Excel existe en la base, es el archivo equivocado: no se toca la lista. */
const MIN_MATCH = 0.5;

export type ApplyResult =
  | { ok: false; error: string }
  | { ok: true; approved: number; byEmail: number; notFound: string[]; notApproved: number; applied: boolean };

// Reemplaza la lista completa (quien no viene con "Sí" queda no aprobado); por código y, si no existe, por correo.
// Con `apply: false` solo cuenta: es la vista previa del script.
export async function applyApprovedList(
  db: PrismaClient,
  rows: readonly ApprovedRow[],
  { apply }: { apply: boolean },
): Promise<ApplyResult> {
  const codes = rows.flatMap((r) => (r.code ? [r.code] : []));
  const emails = rows.flatMap((r) => (r.email ? [r.email] : []));
  const [byCode, byEmail] = await Promise.all([
    db.attendee.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } }),
    db.attendee.findMany({ where: { email: { in: emails, mode: "insensitive" } }, select: { id: true, email: true } }),
  ]);
  const idByCode = new Map(byCode.map((a) => [a.code, a.id]));
  const idByEmail = new Map(byEmail.map((a) => [a.email?.toLowerCase() ?? "", a.id]));

  const ids = new Set<string>();
  const notFound: string[] = [];
  let viaEmail = 0;
  for (const row of rows) {
    const id = (row.code && idByCode.get(row.code)) || (row.email && idByEmail.get(row.email)) || null;
    if (!id) {
      notFound.push(row.code ?? row.email ?? "");
      continue;
    }
    ids.add(id);
    if (!(row.code && idByCode.has(row.code))) viaEmail++;
  }
  const matched = rows.length - notFound.length;
  if (matched < rows.length * MIN_MATCH) {
    return {
      ok: false,
      error: `Solo ${matched} de ${rows.length} aprobados del Excel tienen pase en el sistema. ¿Es el archivo correcto? No se cambió nada.`,
    };
  }

  const idList = [...ids];
  if (apply) {
    await db.$transaction([
      db.attendee.updateMany({ where: { id: { notIn: idList } }, data: { approved: false } }),
      db.attendee.updateMany({ where: { id: { in: idList } }, data: { approved: true } }),
    ]);
  }
  const total = await db.attendee.count();
  return {
    ok: true,
    approved: idList.length,
    byEmail: viaEmail,
    notFound,
    notApproved: total - idList.length,
    applied: apply,
  };
}
