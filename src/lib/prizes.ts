import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Seguimiento de premios. Cada contador sale de su propia consulta: si se
 * calcula "pendientes = completos - entregados" el numero se va a negativo
 * cuando alguien recibio premio y luego dejo de figurar como completo (por
 * ejemplo, al agregar una estacion).
 */
export const PRIZE_TABS = [
  { key: "pendientes", label: "Pendientes" },
  { key: "entregados", label: "Entregados" },
  { key: "todos", label: "Todos" },
] as const;

export type PrizeTab = (typeof PRIZE_TABS)[number]["key"];

export function parsePrizeTab(value: string | null | undefined): PrizeTab {
  return PRIZE_TABS.find((tab) => tab.key === value)?.key ?? "pendientes";
}

/** Completo y sin premio: es lo que la mesa de premios tiene por entregar. */
export const PENDING_PRIZE: Prisma.AttendeeWhereInput = {
  completedAt: { not: null },
  redeemedAt: null,
};

export function prizeWhere(tab: PrizeTab, q: string): Prisma.AttendeeWhereInput {
  const search: Prisma.AttendeeWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { code: { contains: q.toUpperCase() } },
        ],
      }
    : {};

  const status: Prisma.AttendeeWhereInput =
    tab === "pendientes"
      ? PENDING_PRIZE
      : tab === "entregados"
        ? { redeemedAt: { not: null } }
        : // "Todos": quien completo o ya recibio premio.
          { OR: [{ completedAt: { not: null } }, { redeemedAt: { not: null } }] };

  return { AND: [search, status] };
}

/** Pendientes primero por quien completo antes; entregados por la entrega mas reciente. */
export function prizeOrder(tab: PrizeTab): Prisma.AttendeeOrderByWithRelationInput[] {
  return tab === "entregados"
    ? [{ redeemedAt: "desc" }, { code: "asc" }]
    : [{ completedAt: { sort: "asc", nulls: "last" } }, { code: "asc" }];
}

export async function getPrizeCounts() {
  const [completed, delivered, pending] = await Promise.all([
    prisma.attendee.count({ where: { completedAt: { not: null } } }),
    prisma.attendee.count({ where: { redeemedAt: { not: null } } }),
    prisma.attendee.count({ where: PENDING_PRIZE }),
  ]);
  return { completed, delivered, pending };
}

/** Columnas del seguimiento de premios: nada de correo ni telefono. */
export const PRIZE_ROW_SELECT = {
  id: true,
  name: true,
  code: true,
  company: true,
  completedAt: true,
  redeemedAt: true,
  redeemedBy: { select: { name: true } },
} satisfies Prisma.AttendeeSelect;

/**
 * Lista corta para la mesa de premios (cualquier staff con sesion): solo
 * nombre y codigo, sin datos de contacto.
 */
export async function getPendingPrizeDesk(q: string, limit = 50) {
  const where = prizeWhere("pendientes", q.trim());
  const [total, rows] = await Promise.all([
    prisma.attendee.count({ where }),
    prisma.attendee.findMany({
      where,
      orderBy: prizeOrder("pendientes"),
      take: limit,
      select: { name: true, code: true },
    }),
  ]);
  return { total, rows };
}
