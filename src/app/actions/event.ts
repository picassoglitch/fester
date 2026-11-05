"use server";

import { revalidatePath } from "next/cache";
import readXlsxFile from "read-excel-file/node";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { approvedFromSheets } from "@/lib/approved";
import { RESET_WORD } from "@/lib/access";

export type ImportState = {
  error?: string;
  ok?: {
    approved: number;
    byEmail: number;
    notFound: string[];
    unmatched: string[];
    notApproved: number;
  };
};

const MAX_BYTES = 4 * 1024 * 1024 - 64 * 1024;
/** Si casi nadie del Excel existe en la base, es el archivo equivocado: no se toca la lista. */
const MIN_MATCH = 0.5;
const DB_ERROR = "No se aplicó ningún cambio (error de base de datos). Intenta de nuevo.";

/** Reemplaza la lista completa: quien no viene con "Sí" en este Excel queda no aprobado. */
export async function importApproved(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige el archivo de Excel." };
  if (file.size > MAX_BYTES) return { error: "El archivo pesa más de 4 MB: borra hojas que no sean REGISTROS y vuelve a subirlo." };

  let sheets;
  try {
    sheets = await readXlsxFile(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    console.error("[aprobados] no se pudo leer el Excel", error);
    return { error: "No pudimos leer el archivo. Debe ser .xlsx (no .ods ni .xls); si ya lo es, ábrelo y guárdalo de nuevo." };
  }
  const list = approvedFromSheets(sheets);
  if (!list.ok) return { error: list.error };

  try {
    const codes = list.rows.flatMap((r) => (r.code ? [r.code] : []));
    const emails = list.rows.flatMap((r) => (r.email ? [r.email] : []));
    const [byCode, byEmail] = await Promise.all([
      prisma.attendee.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } }),
      prisma.attendee.findMany({
        where: { email: { in: emails, mode: "insensitive" } },
        select: { id: true, email: true },
      }),
    ]);
    const idByCode = new Map(byCode.map((a) => [a.code, a.id]));
    const idByEmail = new Map(byEmail.map((a) => [a.email?.toLowerCase() ?? "", a.id]));

    const ids = new Set<string>();
    const notFound: string[] = [];
    let viaEmail = 0;
    for (const row of list.rows) {
      const id = (row.code && idByCode.get(row.code)) || (row.email && idByEmail.get(row.email)) || null;
      if (!id) notFound.push(row.code ?? row.email ?? "");
      else {
        ids.add(id);
        if (!(row.code && idByCode.has(row.code))) viaEmail++;
      }
    }
    const matched = list.rows.length - notFound.length;
    if (matched < list.rows.length * MIN_MATCH) {
      return {
        error: `Solo ${matched} de ${list.rows.length} aprobados del Excel tienen pase en el sistema. ¿Es el archivo correcto? No se cambió nada.`,
      };
    }

    const idList = [...ids];
    await prisma.$transaction([
      prisma.attendee.updateMany({ where: { id: { notIn: idList } }, data: { approved: false } }),
      prisma.attendee.updateMany({ where: { id: { in: idList } }, data: { approved: true } }),
    ]);
    const notApproved = await prisma.attendee.count({ where: { approved: false } });

    revalidatePath("/admin/aprobados");
    revalidatePath("/admin/rifa");
    return { ok: { approved: idList.length, byEmail: viaEmail, notFound, unmatched: list.unmatched, notApproved } };
  } catch (error) {
    console.error("[aprobados] fallo al aplicar la lista", error);
    return { error: DB_ERROR };
  }
}

export type ResetState = { error?: string; ok?: string };



// Junta Fester 2026-11-04 — como si nadie hubiera llegado; conserva registros, aprobados, staff y estaciones.
export async function resetEvent(_prev: ResetState, formData: FormData): Promise<ResetState> {
  await requireAdmin();
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== RESET_WORD) {
    return { error: `Escribe ${RESET_WORD} para confirmar.` };
  }
  let result;
  try {
    result = await prisma.$transaction([
    prisma.scan.deleteMany({}),
    prisma.access.deleteMany({}),
    prisma.raffleWinner.deleteMany({}),
    prisma.attendee.updateMany({
      where: {
        OR: [
          { completedAt: { not: null } },
          { redeemedAt: { not: null } },
          { insideAt: { not: null } },
        ],
      },
      data: { completedAt: null, redeemedAt: null, redeemedById: null, insideAt: null },
    }),
  ]);
  } catch (error) {
    console.error("[reinicio] fallo", error);
    return { error: DB_ERROR };
  }
  const [scans, accesses, winners, attendees] = result;
  revalidatePath("/admin", "layout");
  return {
    ok: `Listo: ${scans.count} escaneos, ${accesses.count} accesos y ${winners.count} ganadores borrados; ${attendees.count} pases en cero.`,
  };
}
