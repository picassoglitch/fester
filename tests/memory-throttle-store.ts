import type { ThrottleRow, ThrottleStore } from "@/lib/throttle";

/** Misma semantica que prismaThrottleStore, en memoria, para pruebas unitarias. */
export function memoryStore(): ThrottleStore & { rows: Map<string, ThrottleRow> } {
  const rows = new Map<string, ThrottleRow>();
  return {
    rows,
    async get(key) {
      const row = rows.get(key);
      return row ? { ...row } : null;
    },
    async increment(key, now, windowMs) {
      const row = rows.get(key);
      if (!row) {
        const fresh = { failures: 1, windowStart: now, lockedUntil: null, lockLevel: 0 };
        rows.set(key, fresh);
        return { ...fresh };
      }
      if (row.windowStart.getTime() < now.getTime() - windowMs) {
        row.failures = 1;
        row.windowStart = now;
      } else {
        row.failures += 1;
      }
      return { ...row };
    },
    async lock(key, now, threshold, baseMs, maxMs) {
      const row = rows.get(key);
      if (!row || row.failures < threshold) return null;
      row.lockedUntil = new Date(now.getTime() + Math.min(baseMs * 2 ** row.lockLevel, maxMs));
      row.lockLevel += 1;
      row.failures = 0;
      row.windowStart = now;
      return { ...row };
    },
    async reset(key) {
      rows.delete(key);
    },
  };
}
