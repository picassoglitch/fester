import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeRateLimit,
  guardPinAttempt,
  lockMessage,
  PIN_GLOBAL_KEY,
  PIN_GLOBAL_POLICY,
  PIN_IP_POLICY,
  prismaThrottleStore,
} from "@/lib/throttle";
import { memoryStore } from "./memory-throttle-store";
import { hasLocalDb } from "./db";

const MIN = 60_000;

function clock(start = Date.parse("2026-11-05T16:00:00Z")) {
  let t = start;
  return { now: () => new Date(t), advance: (ms: number) => (t += ms) };
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("guardPinAttempt", () => {
  it("bloquea la IP al quinto fallo y no compara mientras dure", async () => {
    const store = memoryStore();
    const c = clock();
    const wrong = vi.fn(async () => null);

    for (let i = 1; i <= 4; i++) {
      const r = await guardPinAttempt({ ipHash: "a", attempt: wrong, now: c.now, store });
      expect(r).toMatchObject({ status: "failed", failures: i, lockedUntil: null });
    }
    const fifth = await guardPinAttempt({ ipHash: "a", attempt: wrong, now: c.now, store });
    expect(fifth.status).toBe("failed");
    expect(fifth.status === "failed" && fifth.lockedUntil?.getTime()).toBe(c.now().getTime() + MIN);

    const right = vi.fn(async () => ({ id: "s1" }));
    const sixth = await guardPinAttempt({ ipHash: "a", attempt: right, now: c.now, store });
    expect(sixth.status).toBe("locked");
    expect(right).not.toHaveBeenCalled();
    expect(wrong).toHaveBeenCalledTimes(5);
  });

  it("duplica el bloqueo en cada repeticion hasta 60 min", async () => {
    const store = memoryStore();
    const c = clock();
    const wrong = async () => null;
    const durations: number[] = [];
    for (let round = 0; round < 8; round++) {
      let last;
      for (let i = 0; i < PIN_IP_POLICY.threshold; i++) {
        last = await guardPinAttempt({ ipHash: "b", attempt: wrong, now: c.now, store });
      }
      const until = last!.status === "failed" ? last!.lockedUntil! : null;
      durations.push((until!.getTime() - c.now().getTime()) / MIN);
      c.advance(until!.getTime() - c.now().getTime() + 1);
    }
    expect(durations).toEqual([1, 2, 4, 8, 16, 32, 60, 60]);
  });

  it("un acierto reinicia el contador de la IP", async () => {
    const store = memoryStore();
    const c = clock();
    for (let i = 0; i < 4; i++) {
      await guardPinAttempt({ ipHash: "c", attempt: async () => null, now: c.now, store });
    }
    const ok = await guardPinAttempt({ ipHash: "c", attempt: async () => 1, now: c.now, store });
    expect(ok).toEqual({ status: "ok", value: 1 });
    const after = await guardPinAttempt({ ipHash: "c", attempt: async () => null, now: c.now, store });
    expect(after).toMatchObject({ status: "failed", failures: 1 });
  });

  it("la ventana de 15 min vence y el conteo vuelve a 1", async () => {
    const store = memoryStore();
    const c = clock();
    for (let i = 0; i < 4; i++) {
      await guardPinAttempt({ ipHash: "d", attempt: async () => null, now: c.now, store });
    }
    c.advance(PIN_IP_POLICY.windowMs + 1);
    const r = await guardPinAttempt({ ipHash: "d", attempt: async () => null, now: c.now, store });
    expect(r).toMatchObject({ failures: 1, lockedUntil: null });
  });

  it("el limite global solo frena (2 s), nunca bloquea", async () => {
    const store = memoryStore();
    const c = clock();
    const sleep = vi.fn(async () => {});
    for (let i = 0; i < PIN_GLOBAL_POLICY.threshold; i++) {
      await guardPinAttempt({ ipHash: `ip${i}`, attempt: async () => null, now: c.now, store, sleep });
    }
    expect(sleep).not.toHaveBeenCalled();
    const attempt = vi.fn(async () => 1);
    const r = await guardPinAttempt({ ipHash: "otra", attempt, now: c.now, store, sleep });
    expect(r.status).toBe("ok");
    expect(attempt).toHaveBeenCalled();
    expect(sleep).toHaveBeenCalledWith(PIN_GLOBAL_POLICY.delayMs);
    expect((await store.get(PIN_GLOBAL_KEY))?.lockedUntil).not.toBeNull();
  });

  it("los logs no llevan el PIN ni la IP", async () => {
    const store = memoryStore();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await guardPinAttempt({ ipHash: "hash123", attempt: async () => null, store });
    const line = String(warn.mock.calls[0][0]);
    expect(JSON.parse(line)).toMatchObject({ event: "pin_login_failed", ipHash: "hash123", failures: 1 });
  });
});

describe("lockMessage", () => {
  it("redondea hacia arriba y usa el singular", () => {
    const now = new Date(0);
    expect(lockMessage(new Date(30_000), now)).toBe("Demasiados intentos. Espera 1 minuto e intenta de nuevo.");
    expect(lockMessage(new Date(4 * MIN), now)).toBe("Demasiados intentos. Espera 4 minutos e intenta de nuevo.");
  });
});

describe("consumeRateLimit", () => {
  it("permite N y rechaza el siguiente", async () => {
    const store = memoryStore();
    const c = clock();
    const results = [];
    for (let i = 0; i < 6; i++) results.push((await consumeRateLimit("k", 5, 60 * MIN, c.now(), store)).allowed);
    expect(results).toEqual([true, true, true, true, true, false]);
  });
});

describe.skipIf(!hasLocalDb)("prismaThrottleStore (base local)", () => {
  const key = `test:${Date.now()}`;

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.authThrottle.deleteMany({ where: { key: { startsWith: "test:" } } });
    await prisma.$disconnect();
  });

  it("10 fallos en paralelo dejan exactamente failures=10", async () => {
    const now = new Date();
    await Promise.all(
      Array.from({ length: 10 }, () => prismaThrottleStore.increment(key, now, PIN_IP_POLICY.windowMs)),
    );
    expect((await prismaThrottleStore.get(key))?.failures).toBe(10);
  });

  it("bloqueo atomico con duracion doble", async () => {
    const now = new Date();
    const locks = await Promise.all(
      Array.from({ length: 5 }, () => prismaThrottleStore.lock(key, now, 5, MIN, 60 * MIN)),
    );
    const applied = locks.filter(Boolean);
    expect(applied).toHaveLength(1);
    expect(applied[0]!.lockedUntil!.getTime() - now.getTime()).toBe(MIN);
    expect(applied[0]!.lockLevel).toBe(1);
  });

  it("la ventana vencida reinicia en 1", async () => {
    const k = `${key}:w`;
    const t0 = new Date(Date.now() - 20 * MIN);
    await prismaThrottleStore.increment(k, t0, PIN_IP_POLICY.windowMs);
    await prismaThrottleStore.increment(k, t0, PIN_IP_POLICY.windowMs);
    const row = await prismaThrottleStore.increment(k, new Date(), PIN_IP_POLICY.windowMs);
    expect(row.failures).toBe(1);
  });
});

describe.skipIf(!hasLocalDb)("prismaThrottleStore: fechas en UTC", () => {
  it("lockedUntil leido por Prisma coincide con el reloj de la app", async () => {
    const key = `test:tz:${Date.now()}`;
    const now = new Date();
    for (let i = 0; i < 5; i++) await prismaThrottleStore.increment(key, now, PIN_IP_POLICY.windowMs);
    await prismaThrottleStore.lock(key, now, 5, MIN, 60 * MIN);
    const row = await prismaThrottleStore.get(key);
    expect(row!.lockedUntil!.getTime() - now.getTime()).toBe(MIN);
    expect(row!.windowStart.getTime()).toBe(now.getTime());
    await prismaThrottleStore.reset(key);
  });
});
