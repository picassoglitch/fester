import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Junta Fester 2026-11-04 — aprobados con pasaporte completo; quien ya salio sorteado (incluso anulado) no repite.
// Aldo 2026-11-05 — quien se registro en la puerta no entra aunque este en la lista de aprobados.
export const RAFFLE_POOL: Prisma.AttendeeWhereInput = {
  approved: true,
  origin: "WEB",
  completedAt: { not: null },
  raffleWins: { none: {} },
};

export type RaffleWinnerRow = {
  id: string;
  name: string;
  code: string;
  company: string | null;
  state: string | null;
  createdAt: Date;
  voidedAt: Date | null;
};

export async function getRaffleState(): Promise<{ pool: number; winners: RaffleWinnerRow[] }> {
  const [pool, winners] = await Promise.all([
    prisma.attendee.count({ where: RAFFLE_POOL }),
    prisma.raffleWinner.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        voidedAt: true,
        attendee: { select: { name: true, code: true, company: true, state: true } },
      },
    }),
  ]);
  return {
    pool,
    winners: winners.map((w) => ({
      id: w.id,
      createdAt: w.createdAt,
      voidedAt: w.voidedAt,
      ...w.attendee,
    })),
  };
}

/** Nombres al azar del pool para el carrete de la animacion. */
export async function getReelNames(limit = 80): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ name: string }[]>`
    SELECT name FROM "Attendee"
    WHERE approved = true AND origin = 'WEB' AND "completedAt" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "RaffleWinner" w WHERE w."attendeeId" = "Attendee".id)
    ORDER BY random() LIMIT ${limit}`;
  return rows.map((r) => r.name);
}
