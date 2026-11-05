"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { RESET_WORD } from "@/lib/access";

const DB_ERROR = "No se aplicó ningún cambio (error de base de datos). Intenta de nuevo.";

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
