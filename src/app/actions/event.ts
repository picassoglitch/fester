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

/** Reemplaza la lista completa: quien no viene con "Sí" en este Excel queda no aprobado. */
export async function importApproved(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige el archivo de Excel." };
  if (file.size > MAX_BYTES) return { error: "El archivo pesa más de 4 MB: borra hojas que no sean REGISTROS y vuelve a subirlo." };

  let sheets;
  try {
    sheets = await readXlsxFile(Buffer.from(await file.arrayBuffer()));
  } catch {
    return { error: "No pudimos leer el archivo. Súbelo como .xlsx (no .ods ni .xls)." };
  }
  const list = approvedFromSheets(sheets);
  if (!list.ok) return { error: list.error };

  const codes = list.approved;
  const emails = list.approvedEmails;
  const [byCode, byEmail] = await Promise.all([
    prisma.attendee.findMany({ where: { code: { in: codes } }, select: { id: true, code: true } }),
    emails.length
      ? prisma.attendee.findMany({
          where: { email: { in: emails, mode: "insensitive" } },
          select: { id: true, email: true },
        })
      : Promise.resolve([]),
  ]);
  const ids = [...new Set([...byCode, ...byEmail].map((a) => a.id))];
  const foundCodes = new Set(byCode.map((a) => a.code));
  const foundEmails = new Set(byEmail.map((a) => a.email?.toLowerCase()));

  await prisma.$transaction([
    prisma.attendee.updateMany({ where: { id: { notIn: ids } }, data: { approved: false } }),
    prisma.attendee.updateMany({ where: { id: { in: ids } }, data: { approved: true } }),
  ]);
  const notApproved = await prisma.attendee.count({ where: { approved: false } });

  revalidatePath("/admin/aprobados");
  revalidatePath("/admin/rifa");
  return {
    ok: {
      approved: ids.length,
      byEmail: byEmail.length,
      notFound: [
        ...codes.filter((c) => !foundCodes.has(c)),
        ...emails.filter((e) => !foundEmails.has(e)),
      ],
      unmatched: list.unmatched,
      notApproved,
    },
  };
}

export type ResetState = { error?: string; ok?: string };



/**
 * Borra la actividad del evento como si nadie hubiera llegado. Conserva
 * registros, aprobados, staff y estaciones (junta con Fester, 2026-11-04).
 */
export async function resetEvent(_prev: ResetState, formData: FormData): Promise<ResetState> {
  await requireAdmin();
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== RESET_WORD) {
    return { error: `Escribe ${RESET_WORD} para confirmar.` };
  }
  const [scans, accesses, winners, attendees] = await prisma.$transaction([
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
  revalidatePath("/admin", "layout");
  return {
    ok: `Listo: ${scans.count} escaneos, ${accesses.count} accesos y ${winners.count} ganadores borrados; ${attendees.count} pases en cero.`,
  };
}
