"use server";

import { redirect } from "next/navigation";
import {
  clearAttendeeSessionCookie,
  getAttendeeSession,
  setAttendeeSessionCookie,
} from "@/lib/auth";
import { isValidCode, normalizeCode } from "@/lib/codes";
import { prisma } from "@/lib/db";
import { passEmail } from "@/lib/emails";
import { sendMail } from "@/lib/mail";
import { confirmEmailCode, isValidEmail, issueEmailCode, normalizeEmail } from "@/lib/verification";

/**
 * Entrada a la cuenta de quien ya se registro: pide el correo, manda un codigo
 * y abre la sesion. Mismo esquema de dos pasos que el registro.
 */
export type AccountState = {
  error?: string;
  notice?: string;
  stage?: "email" | "code";
  email?: string;
  /** El correo no tiene registro: la pantalla ofrece crear el pase. */
  notFound?: boolean;
};

/** Entrada alterna: el codigo impreso en el pase, sin pasar por el correo. */
export type PassCodeState = { error?: string };

function pick(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function accessAccount(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const email = normalizeEmail(pick(formData, "email"));
  if (!isValidEmail(email)) return { stage: "email", error: "El correo no parece válido." };

  const attendee = await prisma.attendee.findFirst({
    where: { email },
    select: { id: true, code: true, name: true },
  });
  if (!attendee) {
    return {
      stage: "email",
      email,
      notFound: true,
      error: "No encontramos ningún registro con ese correo.",
    };
  }

  const verifying = pick(formData, "stage") === "code";
  const intent = pick(formData, "intent");
  const typedCode = pick(formData, "verificationCode");

  if (!verifying || intent === "resend") {
    const issued = await issueEmailCode(email, "LOGIN");
    if (!issued.ok) {
      const stage = verifying || issued.reason === "cooldown" ? "code" : "email";
      return { stage, email, error: issued.error };
    }
    return { stage: "code", email, notice: `Te enviamos un código de 6 dígitos a ${email}.` };
  }

  if (!typedCode) return { stage: "code", email, error: "Escribe el código que te enviamos." };

  const confirmed = await confirmEmailCode(email, "LOGIN", typedCode);
  if (!confirmed.ok) return { stage: "code", email, error: confirmed.error };

  await prisma.attendee.update({
    where: { id: attendee.id },
    data: { emailVerifiedAt: new Date() },
  });
  await setAttendeeSessionCookie({
    id: attendee.id,
    code: attendee.code,
    name: attendee.name,
    email,
  });

  redirect(`/pase/${attendee.code}`);
}

/**
 * Abre el pase con el codigo que la persona trae a la mano (el del QR). No abre
 * sesion: el codigo prueba que tiene el pase, no que el correo sea suyo, y la
 * pagina del pase ya funciona con el codigo solo.
 */
export async function openPassWithCode(
  _prev: PassCodeState,
  formData: FormData,
): Promise<PassCodeState> {
  const code = normalizeCode(pick(formData, "code"));
  if (!isValidCode(code)) {
    return { error: "Escribe el código de tu pase, como el que aparece bajo tu QR." };
  }

  const attendee = await prisma.attendee.findUnique({ where: { code }, select: { id: true } });
  if (!attendee) {
    return { error: "Ese código no existe. Revísalo o entra con tu correo." };
  }

  redirect(`/pase/${code}`);
}

/** Reenvia el pase al correo de la sesion abierta. */
export async function resendPassEmail(): Promise<void> {
  const session = await getAttendeeSession();
  if (!session) redirect("/mi-cuenta");

  const attendee = await prisma.attendee.findUnique({
    where: { id: session.id },
    select: { code: true, name: true, email: true },
  });
  if (!attendee?.email) redirect("/mi-cuenta");

  const sent = await sendMail(
    passEmail({ to: attendee.email, name: attendee.name, code: attendee.code }),
  );
  if (!sent.ok) console.error(`[cuenta] No se pudo reenviar el pase ${attendee.code}`);

  redirect(`/mi-cuenta?enviado=${sent.ok ? "si" : "no"}`);
}

export async function signOutAttendee(): Promise<void> {
  await clearAttendeeSessionCookie();
  redirect("/");
}
