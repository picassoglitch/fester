"use server";

import { redirect } from "next/navigation";
import { setAttendeeSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { passEmail } from "@/lib/emails";
import { sendMail } from "@/lib/mail";
import { clientIpHash } from "@/lib/throttle";
import { confirmEmailCode, issueEmailCode, normalizeEmail } from "@/lib/verification";
import { createAttendee, emailError, nameError, parsePosition, pick, withDetail } from "@/lib/registration";
import {
  AGE_LIMITS,
  INDEPENDENT_LABEL,
  REGISTRATION_CLOSED,
  REGISTRATION_OPEN,
  INDUSTRIES,
  REFERRAL_SOURCES,
  STATES,
} from "@/lib/event";

/**
 * El registro tiene dos pasos: primero los datos y despues el codigo que
 * enviamos al correo. `stage` le dice al formulario cual mostrar.
 */
export type RegisterState = {
  error?: string;
  notice?: string;
  stage?: "form" | "verify" | "done";
  email?: string;
  /** Solo con stage "done": el cliente manda el evento del pixel y navega aqui. */
  passPath?: string;
};

export async function registerAttendee(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  // Cerrado en el servidor, no solo en la vista: un POST directo tampoco crea pases.
  if (!REGISTRATION_OPEN) return { error: REGISTRATION_CLOSED.error };
  const name = pick(formData, "name");
  // Quien trabaja por su cuenta marca la casilla y "Empresa" se guarda como "Independiente".
  const independent = formData.get("independent") !== null;
  const company = independent ? INDEPENDENT_LABEL : pick(formData, "company");
  const email = pick(formData, "email");
  const phone = pick(formData, "phone");
  const positionChoice = pick(formData, "position");
  const industryChoice = pick(formData, "industry");
  const state = pick(formData, "state");
  const ageRaw = pick(formData, "age");
  const referralChoice = pick(formData, "referral");
  const privacy = formData.get("privacy") !== null;

  const badName = nameError(name);
  if (badName) return { error: badName };
  if (company.length < 2) {
    return { error: "Escribe el nombre de tu empresa o marca que eres independiente." };
  }
  if (company.length > 100) return { error: "El nombre de la empresa es demasiado largo." };
  const badEmail = emailError(email);
  if (badEmail) return { error: badEmail };
  if (!/^[\d+\s()-]{7,20}$/.test(phone)) {
    return { error: "El teléfono no parece válido." };
  }
  const position = parsePosition(positionChoice, pick(formData, "positionOther"));
  if (typeof position !== "string") return position;
  // Los demas catalogos tambien vienen de un <select>: se validan contra la lista.
  if (!INDUSTRIES.includes(industryChoice as (typeof INDUSTRIES)[number])) {
    return { error: "Selecciona el giro de tu empresa." };
  }
  const industry = withDetail(industryChoice, pick(formData, "industryOther"));
  if (typeof industry !== "string") return industry;
  if (!STATES.includes(state as (typeof STATES)[number])) {
    return { error: "Selecciona tu estado." };
  }
  const age = Number.parseInt(ageRaw, 10);
  if (!/^\d{1,3}$/.test(ageRaw) || age < AGE_LIMITS.min || age > AGE_LIMITS.max) {
    return { error: `Escribe tu edad (entre ${AGE_LIMITS.min} y ${AGE_LIMITS.max} años).` };
  }
  if (!REFERRAL_SOURCES.includes(referralChoice as (typeof REFERRAL_SOURCES)[number])) {
    return { error: "Cuéntanos cómo te enteraste del evento." };
  }
  const referral = withDetail(referralChoice, pick(formData, "referralOther"));
  if (typeof referral !== "string") return referral;
  if (!privacy) {
    return { error: "Necesitamos que aceptes los términos y condiciones y el aviso de privacidad." };
  }

  const address = normalizeEmail(email);
  const verifying = pick(formData, "stage") === "verify";
  const intent = pick(formData, "intent");
  const typedCode = pick(formData, "verificationCode");

  // Paso 1: los datos estan bien, pero nadie entra sin comprobar el correo.
  if (!verifying || intent === "resend") {
    const issued = await issueEmailCode(address, "REGISTER", await clientIpHash());
    if (!issued.ok) {
      // Con el cooldown el codigo anterior sigue vigente: mejor mandarla a
      // escribirlo que dejarla esperando en el paso de los datos.
      const stage = verifying || issued.reason === "cooldown" ? "verify" : "form";
      return { stage, email: address, error: issued.error };
    }
    return {
      stage: "verify",
      email: address,
      notice: `Te enviamos un código de 6 dígitos a ${address}.`,
    };
  }

  // Paso 2: el codigo del correo.
  if (!typedCode) {
    return { stage: "verify", email: address, error: "Escribe el código que te enviamos." };
  }
  const confirmed = await confirmEmailCode(address, "REGISTER", typedCode);
  if (!confirmed.ok) return { stage: "verify", email: address, error: confirmed.error };

  const existing = await prisma.attendee.findFirst({
    where: { email: address },
    select: { id: true, code: true, name: true },
  });

  // Si ya se registro con ese correo, lo devolvemos a su pase en vez de
  // duplicarlo; el codigo que acaba de confirmar prueba que el correo es suyo.
  if (existing) {
    await prisma.attendee.update({
      where: { id: existing.id },
      data: { emailVerifiedAt: new Date() },
    });
    await sendMail(passEmail({ to: address, name: existing.name, code: existing.code }));
    await setAttendeeSessionCookie({
      id: existing.id,
      code: existing.code,
      name: existing.name,
      email: address,
    });
    redirect(`/pase/${existing.code}`);
  }

  const created = await createAttendee({
    name,
    email: address,
    phone,
    company,
    position,
    industry,
    state,
    age,
    referral,
    privacyAt: new Date(),
    emailVerifiedAt: new Date(),
  });
  if (!created) {
    return { stage: "verify", email: address, error: "No pudimos generar tu código. Intenta de nuevo." };
  }
  const { code } = created;

  // El pase ya existe: si el correo de confirmacion falla, se avisa en el log
  // pero no se bloquea a la persona, que va directo a su pase.
  const delivered = await sendMail(passEmail({ to: address, name, code }));
  if (!delivered.ok) console.error(`[registro] No se pudo enviar el pase ${code}: ${delivered.error}`);

  await setAttendeeSessionCookie({ id: created.id, code, name, email: address });

  // Sin redirect: el formulario manda CompleteRegistration al pixel desde la
  // landing (la URL del pase lleva el codigo y no debe llegar a Meta) y navega.
  return { stage: "done", passPath: `/pase/${code}` };
}
