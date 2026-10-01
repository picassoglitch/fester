/**
 * Limites de intentos que sobreviven entre invocaciones serverless: viven en
 * la tabla AuthThrottle (un Map en memoria no sirve en Vercel). Cada contador
 * se incrementa con un solo INSERT … ON CONFLICT para que dos peticiones
 * simultaneas no se pisen.
 *
 * Las llaves nunca llevan la IP en claro: se guarda su HMAC.
 */
import { createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { getSecret } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ThrottleRow = {
  failures: number;
  windowStart: Date;
  lockedUntil: Date | null;
  lockLevel: number;
};

export type ThrottleStore = {
  get(key: string): Promise<ThrottleRow | null>;
  /** Suma 1 de forma atomica; si la ventana ya vencio, reinicia en 1. */
  increment(key: string, now: Date, windowMs: number): Promise<ThrottleRow>;
  /**
   * Bloquea la llave si sigue en `threshold` fallos o mas (atomico: solo una
   * peticion concurrente aplica el bloqueo). La duracion es
   * min(baseMs * 2^lockLevel, maxMs) y luego sube lockLevel.
   */
  lock(key: string, now: Date, threshold: number, baseMs: number, maxMs: number): Promise<ThrottleRow | null>;
  reset(key: string): Promise<void>;
};

/* ---------------------------------- politicas --------------------------------- */

/** Por IP: 5 PIN fallidos en 15 min bloquean 1 min, y se duplica (1, 2, 4… 60). */
export const PIN_IP_POLICY = {
  threshold: 5,
  windowMs: 15 * 60_000,
  baseLockMs: 60_000,
  maxLockMs: 60 * 60_000,
};

/**
 * Global (el PIN no dice de que cuenta es): 50 fallos en 10 min activan 2 s de
 * espera por intento durante 10 min. Solo frena; un bloqueo duro dejaria a
 * todo el staff del evento fuera, porque comparten la red del recinto.
 */
export const PIN_GLOBAL_POLICY = {
  threshold: 50,
  windowMs: 10 * 60_000,
  slowdownMs: 10 * 60_000,
  delayMs: 2_000,
};

export const PIN_GLOBAL_KEY = "pin:global";

/* ------------------------------ almacenamiento DB ------------------------------ */

type RawRow = { failures: number; windowStart: Date; lockedUntil: Date | null; lockLevel: number };

export const prismaThrottleStore: ThrottleStore = {
  async get(key) {
    return prisma.authThrottle.findUnique({
      where: { key },
      select: { failures: true, windowStart: true, lockedUntil: true, lockLevel: true },
    });
  },

  async increment(key, now, windowMs) {
    // Prisma guarda DateTime como timestamp sin zona, en UTC. Los parametros se
    // convierten explicito para no depender de la zona de la sesion de Postgres.
    const at = Prisma.sql`(${now}::timestamptz AT TIME ZONE 'UTC')`;
    const floor = Prisma.sql`(${new Date(now.getTime() - windowMs)}::timestamptz AT TIME ZONE 'UTC')`;
    const rows = await prisma.$queryRaw<RawRow[]>`
      INSERT INTO "AuthThrottle" ("key", "failures", "windowStart", "lockLevel", "updatedAt")
      VALUES (${key}, 1, ${at}, 0, ${at})
      ON CONFLICT ("key") DO UPDATE SET
        "failures" = CASE WHEN "AuthThrottle"."windowStart" < ${floor}
                          THEN 1 ELSE "AuthThrottle"."failures" + 1 END,
        "windowStart" = CASE WHEN "AuthThrottle"."windowStart" < ${floor}
                             THEN ${at} ELSE "AuthThrottle"."windowStart" END,
        "updatedAt" = ${at}
      RETURNING "failures", "windowStart", "lockedUntil", "lockLevel"`;
    return rows[0];
  },

  async lock(key, now, threshold, baseMs, maxMs) {
    const at = Prisma.sql`(${now}::timestamptz AT TIME ZONE 'UTC')`;
    const rows = await prisma.$queryRaw<RawRow[]>`
      UPDATE "AuthThrottle" SET
        "lockedUntil" = ${at}
          + LEAST(${baseMs}::float8 * power(2, "lockLevel"), ${maxMs}::float8) * interval '1 millisecond',
        "lockLevel" = "lockLevel" + 1,
        "failures" = 0,
        "windowStart" = ${at},
        "updatedAt" = ${at}
      WHERE "key" = ${key} AND "failures" >= ${threshold}
      RETURNING "failures", "windowStart", "lockedUntil", "lockLevel"`;
    return rows[0] ?? null;
  },

  async reset(key) {
    await prisma.authThrottle.deleteMany({ where: { key } });
  },
};

/* ----------------------------------- helpers ---------------------------------- */

export function hmacKey(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex").slice(0, 32);
}

/** IP del cliente segun el proxy de Vercel, ya convertida en HMAC. */
export async function clientIpHash(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || store.get("x-real-ip")?.trim() || "unknown";
  return hmacKey(ip);
}

export function minutesLeft(until: Date, now: Date): number {
  return Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60_000));
}

export function lockMessage(until: Date, now: Date): string {
  const n = minutesLeft(until, now);
  return `Demasiados intentos. Espera ${n} ${n === 1 ? "minuto" : "minutos"} e intenta de nuevo.`;
}

/** Fecha de fin del bloqueo si la llave sigue bloqueada, o null. */
export async function lockedUntil(
  key: string,
  now = new Date(),
  store: ThrottleStore = prismaThrottleStore,
): Promise<Date | null> {
  const row = await store.get(key);
  return row?.lockedUntil && row.lockedUntil > now ? row.lockedUntil : null;
}

/**
 * Limite simple de N eventos por ventana (envio de codigos, correo de prueba).
 * Cuenta el intento aunque se rechace.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = new Date(),
  store: ThrottleStore = prismaThrottleStore,
): Promise<{ allowed: boolean; count: number }> {
  const row = await store.increment(key, now, windowMs);
  return { allowed: row.failures <= limit, count: row.failures };
}

/* --------------------------------- login con PIN -------------------------------- */

export type PinAttemptResult<T> =
  | { status: "ok"; value: T }
  | { status: "locked"; until: Date }
  | { status: "failed"; failures: number; lockedUntil: Date | null };

type PinGuardOptions<T> = {
  ipHash: string;
  /** Compara el PIN; regresa null si no coincide. Nunca se llama si la IP esta bloqueada. */
  attempt: () => Promise<T | null>;
  now?: () => Date;
  store?: ThrottleStore;
  sleep?: (ms: number) => Promise<void>;
};

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Envuelve la comparacion de PIN: revisa el bloqueo antes de hacer cualquier
 * bcrypt, aplica la espera global si hay ataque en curso y solo cuenta fallos
 * (el staff comparte la IP del recinto, asi que los aciertos no suman).
 */
export async function guardPinAttempt<T>({
  ipHash,
  attempt,
  now = () => new Date(),
  store = prismaThrottleStore,
  sleep = realSleep,
}: PinGuardOptions<T>): Promise<PinAttemptResult<T>> {
  const ipKey = `pin:ip:${ipHash}`;

  const until = await lockedUntil(ipKey, now(), store);
  if (until) return { status: "locked", until };

  const slowdown = await lockedUntil(PIN_GLOBAL_KEY, now(), store);
  if (slowdown) await sleep(PIN_GLOBAL_POLICY.delayMs);

  const value = await attempt();
  if (value !== null) {
    await store.reset(ipKey);
    return { status: "ok", value };
  }

  const at = now();
  const ipRow = await store.increment(ipKey, at, PIN_IP_POLICY.windowMs);
  let ipLockedUntil: Date | null = null;
  if (ipRow.failures >= PIN_IP_POLICY.threshold) {
    const locked = await store.lock(
      ipKey,
      at,
      PIN_IP_POLICY.threshold,
      PIN_IP_POLICY.baseLockMs,
      PIN_IP_POLICY.maxLockMs,
    );
    ipLockedUntil = locked?.lockedUntil ?? null;
  }

  const globalRow = await store.increment(PIN_GLOBAL_KEY, at, PIN_GLOBAL_POLICY.windowMs);
  if (globalRow.failures >= PIN_GLOBAL_POLICY.threshold) {
    // Duracion fija: base = max = slowdownMs.
    const slowed = await store.lock(
      PIN_GLOBAL_KEY,
      at,
      PIN_GLOBAL_POLICY.threshold,
      PIN_GLOBAL_POLICY.slowdownMs,
      PIN_GLOBAL_POLICY.slowdownMs,
    );
    if (slowed) {
      console.warn(JSON.stringify({ event: "pin_global_slowdown", lockedUntil: slowed.lockedUntil }));
    }
  }

  console.warn(
    JSON.stringify({
      event: "pin_login_failed",
      ipHash,
      failures: ipLockedUntil ? PIN_IP_POLICY.threshold : ipRow.failures,
      lockedUntil: ipLockedUntil,
    }),
  );
  if (ipLockedUntil) {
    console.warn(JSON.stringify({ event: "pin_login_locked", ipHash, lockedUntil: ipLockedUntil }));
  }

  return { status: "failed", failures: ipRow.failures, lockedUntil: ipLockedUntil };
}
