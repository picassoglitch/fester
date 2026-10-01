import { afterAll, describe, expect, it, vi } from "vitest";
import { hasLocalDb } from "./db";

const sendMail = vi.fn(async () => ({ ok: true as const, simulated: true }));
vi.mock("@/lib/mail", () => ({ sendMail }));

describe.skipIf(!hasLocalDb)("issueEmailCode: límite por IP (base local)", () => {
  const ipHash = `test-ip-${Date.now()}`;
  const emails = Array.from({ length: 11 }, (_, i) => `limite-ip-${Date.now()}-${i}@example.com`);

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.emailVerification.deleteMany({ where: { email: { in: emails } } });
    await prisma.authThrottle.deleteMany({ where: { key: `email-code:ip:${ipHash}` } });
    await prisma.$disconnect();
  });

  it("el código 11 de una IP en la hora no llama sendMail", async () => {
    const { issueEmailCode, MAX_PER_IP_PER_HOUR } = await import("@/lib/verification");
    expect(MAX_PER_IP_PER_HOUR).toBe(10);
    const results = [];
    for (const email of emails) results.push(await issueEmailCode(email, "REGISTER", ipHash));
    expect(results.slice(0, 10).every((r) => r.ok)).toBe(true);
    expect(results[10]).toMatchObject({ ok: false, reason: "rate-limit", error: expect.stringContaining("Pediste demasiados") });
    expect(sendMail).toHaveBeenCalledTimes(10);
  });
});
