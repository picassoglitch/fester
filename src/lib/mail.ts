/**
 * Envio de correo con Resend (https://resend.com).
 *
 * Solo se necesita RESEND_API_KEY y RESEND_FROM en el entorno; el dominio
 * encuentro@fester.com.mx ya esta verificado del lado de Resend, asi que no
 * hace falta SDK: la API REST basta y no suma dependencias al bundle.
 *
 * Sin RESEND_API_KEY el envio se "simula": en desarrollo el correo se imprime
 * en la terminal (util para leer el codigo de verificacion sin buzon), y en
 * produccion se devuelve un error para no dejar pasar a nadie sin validar.
 */

import { CONTACT, supportEmail } from "@/lib/event";

const ENDPOINT = "https://api.resend.com/emails";

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type MailResult = { ok: true } | { ok: false; error: string };

/** Remitente verificado en Resend. Se puede sobreescribir con RESEND_FROM. */
export function mailFrom(): string {
  return process.env.RESEND_FROM || `Encuentro Fester <${CONTACT.email}>`;
}

/** A donde llegan las respuestas de la gente: el buzon de soporte del evento. */
export function mailReplyTo(): string {
  return process.env.RESEND_REPLY_TO || supportEmail();
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("[mail] Falta RESEND_API_KEY: no se envio el correo.");
      return { ok: false, error: "El envio de correos no esta configurado." };
    }
    console.info(
      `[mail] Sin RESEND_API_KEY (modo local). Para: ${message.to}\n` +
        `Asunto: ${message.subject}\n${message.text}`,
    );
    return { ok: true };
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mailFrom(),
        to: [message.to],
        reply_to: mailReplyTo(),
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(`[mail] Resend respondio ${response.status}: ${detail}`);
      return { ok: false, error: "No pudimos enviar el correo. Intenta de nuevo." };
    }

    return { ok: true };
  } catch (error) {
    console.error("[mail] Error de red al hablar con Resend:", error);
    return { ok: false, error: "No pudimos enviar el correo. Intenta de nuevo." };
  }
}
