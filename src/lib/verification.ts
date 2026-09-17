/**
 * Codigos de un solo uso que confirman que el correo existe y es de quien lo
 * escribe. Se usan antes de crear un pase (REGISTER) y para que quien ya se
 * registro vuelva a entrar a su cuenta (LOGIN).
 *
 * En la base solo queda el HMAC del codigo: si alguien lee la tabla no puede
 * usar los codigos pendientes.
 */

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { VerificationPurpose } from "@prisma/client";
import { getSecret } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verificationEmail } from "@/lib/emails";
import { sendMail } from "@/lib/mail";

/** Minutos que vive un codigo antes de vencer. */
export const CODE_TTL_MINUTES = 15;
/** Segundos que hay que esperar antes de pedir otro codigo. */
export const RESEND_COOLDOWN_SECONDS = 60;
/** Intentos fallidos antes de invalidar el codigo. */
const MAX_ATTEMPTS = 5;
/** Codigos que puede pedir un mismo correo por hora. */
const MAX_PER_HOUR = 6;

/**
 * `reason` distingue el fallo que no es culpa de la persona: con "cooldown" el
 * codigo anterior sigue vigente, asi que quien llama la manda a escribirlo en
 * vez de dejarla atorada en el paso anterior.
 */
export type VerificationFailure = "invalid-email" | "cooldown" | "rate-limit" | "send-failed";

export type VerificationResult =
  | { ok: true }
  | { ok: false; error: string; reason: VerificationFailure };

/** Al comprobar el codigo el fallo siempre es del codigo escrito. */
export type ConfirmResult = { ok: true } | { ok: false; error: string };

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 120;
}

function hashCode(email: string, purpose: VerificationPurpose, code: string): string {
  return createHmac("sha256", getSecret()).update(`${purpose}:${email}:${code}`).digest("hex");
}

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Genera un codigo, lo guarda y lo manda por correo. */
export async function issueEmailCode(
  rawEmail: string,
  purpose: VerificationPurpose,
): Promise<VerificationResult> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    return { ok: false, error: "El correo no parece válido.", reason: "invalid-email" };
  }

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [recentCount, pending] = await Promise.all([
    prisma.emailVerification.count({ where: { email, createdAt: { gt: hourAgo } } }),
    prisma.emailVerification.findFirst({
      where: { email, purpose, consumedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  if (recentCount >= MAX_PER_HOUR) {
    return {
      ok: false,
      error: "Pediste demasiados códigos. Espera una hora o escríbenos para ayudarte.",
      reason: "rate-limit",
    };
  }

  if (pending) {
    const elapsed = Math.floor((now.getTime() - pending.createdAt.getTime()) / 1000);
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      const wait = RESEND_COOLDOWN_SECONDS - elapsed;
      return {
        ok: false,
        error: `Ya te enviamos un código: escríbelo aquí o pide otro en ${wait} segundos.`,
        reason: "cooldown",
      };
    }
  }

  const code = newCode();
  const record = await prisma.emailVerification.create({
    data: {
      email,
      purpose,
      codeHash: hashCode(email, purpose, code),
      expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000),
    },
    select: { id: true },
  });

  const sent = await sendMail(verificationEmail({ to: email, code, purpose }));
  if (!sent.ok) {
    // Si el correo no salio, el codigo no sirve de nada: se borra para que la
    // persona pueda reintentar de inmediato sin toparse con el cooldown.
    await prisma.emailVerification.delete({ where: { id: record.id } }).catch(() => {});
    return { ok: false, error: sent.error, reason: "send-failed" };
  }

  return { ok: true };
}

/** Valida el codigo que escribio la persona y lo marca como usado. */
export async function confirmEmailCode(
  rawEmail: string,
  purpose: VerificationPurpose,
  rawCode: string,
): Promise<ConfirmResult> {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "Escribe los 6 dígitos que te enviamos." };

  const record = await prisma.emailVerification.findFirst({
    where: { email, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return { ok: false, error: "El código venció o ya se usó. Pide uno nuevo." };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.emailVerification.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return { ok: false, error: "Demasiados intentos con ese código. Pide uno nuevo." };
  }

  if (!sameHash(record.codeHash, hashCode(email, purpose, code))) {
    const used = await prisma.emailVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    const left = Math.max(0, MAX_ATTEMPTS - used.attempts);
    return {
      ok: false,
      error: left > 0 ? `Código incorrecto. Te quedan ${left} intentos.` : "Código incorrecto.",
    };
  }

  // Se consumen tambien los codigos anteriores del mismo correo y proposito.
  await prisma.emailVerification.updateMany({
    where: { email, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  return { ok: true };
}
