/**
 * Envio de correo con Resend (https://resend.com).
 *
 * Basta con RESEND_API_KEY: el dominio encuentrofester.com.mx esta verificado
 * del lado de Resend y de ahi sale el remitente. No hace falta SDK, la API REST
 * alcanza y no suma dependencias al bundle.
 *
 * Sin RESEND_API_KEY el envio se "simula": en desarrollo el correo se imprime
 * en la terminal (util para leer el codigo de verificacion sin buzon), y en
 * produccion se devuelve un error para no dejar pasar a nadie sin validar.
 */

import { DEFAULT_MAIL_FROM, supportEmail } from "@/lib/event";

const ENDPOINT = "https://api.resend.com/emails";

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * En el fallo se guarda lo que respondio Resend (`status` y `detail`) para que
 * /api/admin/correo lo muestre tal cual; a la persona que se registra solo se
 * le ensena `error`.
 */
export type MailResult =
  | { ok: true; id?: string; simulated?: boolean }
  | { ok: false; error: string; status?: number; detail?: string };

/**
 * Remitente. Tiene que ser del dominio verificado en Resend: con cualquier otro
 * la API responde 403 y nadie recibe su codigo.
 */
export function mailFrom(): string {
  return process.env.RESEND_FROM || DEFAULT_MAIL_FROM;
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
      return {
        ok: false,
        error: "El envío de correos no está configurado. Escríbenos y te ayudamos.",
        detail: "RESEND_API_KEY no esta definida en el entorno de este despliegue.",
      };
    }
    console.info(
      `[mail] Sin RESEND_API_KEY (modo local). Para: ${message.to}\n` +
        `Asunto: ${message.subject}\n${message.text}`,
    );
    return { ok: true, simulated: true };
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

    const raw = await response.text().catch(() => "");

    if (!response.ok) {
      console.error(
        `[mail] Resend respondio ${response.status} para from="${mailFrom()}" to="${message.to}": ${raw}`,
      );
      return {
        ok: false,
        error: `No pudimos enviar el correo. Intenta de nuevo o escríbenos a ${supportEmail()}.`,
        status: response.status,
        detail: raw,
      };
    }

    let id: string | undefined;
    try {
      id = JSON.parse(raw)?.id;
    } catch {
      /* Resend siempre responde JSON, pero el id es opcional para nosotros. */
    }
    return { ok: true, id };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[mail] Error de red al hablar con Resend:", detail);
    return {
      ok: false,
      error: `No pudimos enviar el correo. Intenta de nuevo o escríbenos a ${supportEmail()}.`,
      detail,
    };
  }
}
