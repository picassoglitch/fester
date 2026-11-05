"use server";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { RAFFLE_POOL } from "@/lib/raffle";

export type RaffleWinnerView = {
  id: string;
  name: string;
  code: string;
  company: string | null;
  state: string | null;
};

export type DrawResult = { ok: true; winner: RaffleWinnerView } | { ok: false; error: string };

const EMPTY = "No hay participantes: nadie aprobado con pasaporte completo queda sin premio.";

export async function drawWinner(): Promise<DrawResult> {
  await requireAdmin();

  // Dos sorteos a la vez pueden caer en la misma persona: el indice unico
  // de RaffleWinner rechaza al segundo y se vuelve a tirar.
  for (let attempt = 0; attempt < 3; attempt++) {
    const pool = await prisma.attendee.count({ where: RAFFLE_POOL });
    if (pool === 0) return { ok: false, error: EMPTY };

    const attendee = await prisma.attendee.findFirst({
      where: RAFFLE_POOL,
      orderBy: { id: "asc" },
      skip: randomInt(pool),
      select: { id: true, name: true, code: true, company: true, state: true },
    });
    if (!attendee) continue;

    try {
      const winner = await prisma.raffleWinner.create({
        data: { attendeeId: attendee.id },
        select: { id: true },
      });
      // Sin revalidatePath: la lista se refresca hasta revelar al ganador en pantalla.
      return {
        ok: true,
        winner: {
          id: winner.id,
          name: attendee.name,
          code: attendee.code,
          company: attendee.company,
          state: attendee.state,
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  return { ok: false, error: "No se pudo sortear. Intenta de nuevo." };
}

/** Anula a quien no esta en el foro. Sigue fuera de la rifa: no se vuelve a sortear. */
export async function voidWinner(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!id) return { ok: false };
  const { count } = await prisma.raffleWinner.updateMany({
    where: { id, voidedAt: null },
    data: { voidedAt: new Date() },
  });
  revalidatePath("/admin/rifa");
  return { ok: count === 1 };
}
