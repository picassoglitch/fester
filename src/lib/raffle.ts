import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { braceletOf } from "@/lib/bracelet";
import { RAFFLE_PRIZES, type RaffleCategory } from "@/lib/raffle-prizes";

// Junta Fester 2026-11-04 — aprobados con pasaporte completo; quien ya salio sorteado (incluso anulado) no repite.
// Aldo 2026-11-05 — quien se registro en la puerta no entra aunque este en la lista de aprobados.
export const RAFFLE_POOL: Prisma.AttendeeWhereInput = {
  approved: true,
  origin: "WEB",
  completedAt: { not: null },
  raffleWins: { none: {} },
};

export type RaffleCandidate = { id: string; name: string; code: string; company: string | null; state: string | null };

/** Categoria de rifa segun el brazalete; Estudiante y sin categoria no participan. */
export function raffleCategoryOf(festerProfile: string | null, position: string | null): RaffleCategory | null {
  const category = braceletOf(festerProfile, position)?.category;
  return category === "Aplicador" || category === "Profesionista" ? category : null;
}

// Pool por categoria: el brazalete sale de una tabla en codigo (braceletOf), no de una columna,
// asi que se filtra aqui y no en SQL.
export async function getRafflePools(
  db: Prisma.TransactionClient = prisma,
): Promise<Record<RaffleCategory, RaffleCandidate[]>> {
  return poolsWhere(RAFFLE_POOL, db);
}

// Aldo 2026-11-05 — mismo pool sin pasaporte completo, pero solo quien ya llegó (Entrada o
// alguna estrella); los aprobados que no vinieron no cuentan.
export const RAFFLE_PENDING: Prisma.AttendeeWhereInput = {
  ...RAFFLE_POOL,
  completedAt: null,
  OR: [{ accesses: { some: { kind: "ENTRY" } } }, { scans: { some: {} } }],
};

// Aldo 2026-11-05 — botón «habilitar a todos»: exactamente los que cuenta «llegaron sin completar pasaporte».
export async function enableArrivedPending(db: Prisma.TransactionClient = prisma): Promise<number> {
  const pending = await poolsWhere(RAFFLE_PENDING, db);
  const ids = [...pending.Aplicador, ...pending.Profesionista].map((c) => c.id);
  if (ids.length === 0) return 0;
  const { count } = await db.attendee.updateMany({
    where: { id: { in: ids }, completedAt: null },
    data: { completedAt: new Date() },
  });
  return count;
}

async function poolsWhere(
  where: Prisma.AttendeeWhereInput,
  db: Prisma.TransactionClient,
): Promise<Record<RaffleCategory, RaffleCandidate[]>> {
  const rows = await db.attendee.findMany({
    where,
    orderBy: { id: "asc" },
    select: { id: true, name: true, code: true, company: true, state: true, festerProfile: true, position: true },
  });
  const pools: Record<RaffleCategory, RaffleCandidate[]> = { Aplicador: [], Profesionista: [] };
  for (const { festerProfile, position, ...candidate } of rows) {
    const category = raffleCategoryOf(festerProfile, position);
    if (category) pools[category].push(candidate);
  }
  return pools;
}

/** Ganadores vigentes (sin anular) por premio. */
export async function filledSlots(db: Prisma.TransactionClient = prisma): Promise<Record<string, number>> {
  const groups = await db.raffleWinner.groupBy({
    by: ["prizeKey"],
    where: { voidedAt: null, prizeKey: { not: null } },
    _count: { _all: true },
  });
  const filled: Record<string, number> = Object.fromEntries(RAFFLE_PRIZES.map((p) => [p.key, 0]));
  for (const g of groups) if (g.prizeKey) filled[g.prizeKey] = g._count._all;
  return filled;
}

export type RaffleWinnerRow = {
  id: string;
  name: string;
  code: string;
  company: string | null;
  state: string | null;
  prizeKey: string | null;
  createdAt: Date;
  voidedAt: Date | null;
};

export type RaffleState = {
  pools: Record<RaffleCategory, number>;
  /** Aprobados de la categoria que ya llegaron y aun no completan el pasaporte. */
  pending: Record<RaffleCategory, number>;
  filled: Record<string, number>;
  winners: RaffleWinnerRow[];
  /** Nombres al azar de cada pool para el carrete de la animacion. */
  reels: Record<RaffleCategory, string[]>;
};

const REEL = 80;

function sample<T>(items: readonly T[], n: number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, n);
}

export async function getRaffleState(): Promise<RaffleState> {
  const [pools, pending, filled, winners] = await Promise.all([
    getRafflePools(),
    poolsWhere(RAFFLE_PENDING, prisma),
    filledSlots(),
    prisma.raffleWinner.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        voidedAt: true,
        prizeKey: true,
        attendee: { select: { name: true, code: true, company: true, state: true } },
      },
    }),
  ]);
  return {
    pools: { Aplicador: pools.Aplicador.length, Profesionista: pools.Profesionista.length },
    pending: { Aplicador: pending.Aplicador.length, Profesionista: pending.Profesionista.length },
    filled,
    reels: {
      Aplicador: sample(pools.Aplicador, REEL).map((c) => c.name),
      Profesionista: sample(pools.Profesionista, REEL).map((c) => c.name),
    },
    winners: winners.map((w) => ({
      id: w.id,
      createdAt: w.createdAt,
      voidedAt: w.voidedAt,
      prizeKey: w.prizeKey,
      ...w.attendee,
    })),
  };
}
