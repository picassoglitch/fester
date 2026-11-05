"use server";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getRafflePools } from "@/lib/raffle";
import { emptyPoolMessage, fullPrizeMessage, rafflePrize } from "@/lib/raffle-prizes";

export type RaffleWinnerView = {
  id: string;
  name: string;
  code: string;
  company: string | null;
  state: string | null;
  prizeKey: string | null;
};

export type DrawResult = { ok: true; winner: RaffleWinnerView } | { ok: false; error: string };

/** Llave del candado de Postgres que pone los sorteos en fila. */
const DRAW_LOCK = "rifa";

export async function drawWinner(prizeKey: string): Promise<DrawResult> {
  await requireAdmin();
  const prize = rafflePrize(prizeKey);
  if (!prize) return { ok: false, error: "Elige un premio para sortear." };

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx): Promise<DrawResult> => {
          // Un sorteo a la vez: dos pantallas no llenan de mas un premio. El indice
          // unico de RaffleWinner sigue impidiendo que alguien gane dos veces.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${DRAW_LOCK}))`;
          const filled = await tx.raffleWinner.count({ where: { prizeKey: prize.key, voidedAt: null } });
          if (filled >= prize.slots) return { ok: false, error: fullPrizeMessage(prize) };

          const pool = (await getRafflePools(tx))[prize.category];
          if (pool.length === 0) return { ok: false, error: emptyPoolMessage(prize) };

          const attendee = pool[randomInt(pool.length)];
          const winner = await tx.raffleWinner.create({
            data: { attendeeId: attendee.id, prizeKey: prize.key },
            select: { id: true },
          });
          // Sin revalidatePath: la lista se refresca hasta revelar al ganador en pantalla.
          return { ok: true, winner: { ...attendee, id: winner.id, prizeKey: prize.key } };
        },
        { maxWait: 10_000, timeout: 20_000 },
      );
    } catch (error) {
      // Respaldo: si algo fuera del candado ya registro a esa persona, el indice unico lo rechaza y se repite.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  return { ok: false, error: "No se pudo sortear. Intenta de nuevo." };
}

/** Anula a quien no esta en el foro: libera el lugar del premio, pero esa persona ya no se vuelve a sortear. */
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
