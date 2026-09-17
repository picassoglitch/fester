/**
 * Plantillas de los correos del evento. Todo va con estilos en linea porque
 * los clientes de correo ignoran las hojas de estilo; el ancho maximo de 560px
 * es lo que se ve bien en movil y en escritorio.
 */

import { CONTACT, EVENT, VENUE } from "@/lib/event";
import type { MailMessage } from "@/lib/mail";
import { appUrl } from "@/lib/site";

const NAVY = "#04162e";
const BRAND = "#e2001a";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, body: string): string {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif;color:${NAVY};">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <tr>
      <td style="background:${NAVY};padding:22px 28px;">
        <p style="margin:0;font-size:18px;font-weight:bold;letter-spacing:1px;color:#ffffff;">${EVENT.name} ${EVENT.year}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#a9bcd4;">${EVENT.dateLabel} · ${VENUE.name}, ${EVENT.city}</p>
      </td>
    </tr>
    <tr><td style="padding:28px;">${body}</td></tr>
    <tr>
      <td style="background:#f3f5f8;padding:18px 28px;font-size:12px;line-height:1.6;color:#5b6b80;">
        ¿Dudas? Escríbenos a <a href="mailto:${CONTACT.email}" style="color:${NAVY};">${CONTACT.email}</a>.<br>
        ${CONTACT.scheduleLabel}.<br>
        © ${year} Fester · Henkel Capital, S.A. de C.V.
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Codigo de 6 digitos para confirmar el correo (registro o regreso). */
export function verificationEmail(params: {
  to: string;
  code: string;
  purpose: "REGISTER" | "LOGIN";
}): MailMessage {
  const isRegister = params.purpose === "REGISTER";
  const intro = isRegister
    ? "Estás a un paso de terminar tu registro. Escribe este código en la página para confirmar tu correo y generar tu pase:"
    : "Recibimos una solicitud para abrir tu cuenta del evento. Escribe este código para entrar a tu pase:";

  const html = layout(
    "Tu código de verificación",
    `<h1 style="margin:0 0 12px;font-size:20px;">Tu código de verificación</h1>
     <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">${intro}</p>
     <p style="margin:0 0 18px;text-align:center;font-size:34px;font-weight:bold;letter-spacing:10px;color:${NAVY};background:#eef2f7;border-radius:12px;padding:16px 8px;">${params.code}</p>
     <p style="margin:0;font-size:13px;line-height:1.6;color:#5b6b80;">El código vence en 15 minutos y solo sirve una vez. Si no fuiste tú, puedes ignorar este correo.</p>`,
  );

  const text = `${intro}\n\n${params.code}\n\nEl codigo vence en 15 minutos y solo sirve una vez.\nSi no fuiste tu, ignora este correo.\n\n${EVENT.name} ${EVENT.year} · ${CONTACT.email}`;

  return { to: params.to, subject: `${params.code} es tu código de ${EVENT.name}`, html, text };
}

/** Confirmacion de registro con el pase y el QR. */
export function passEmail(params: { to: string; name: string; code: string }): MailMessage {
  const base = appUrl();
  const passUrl = `${base}/pase/${params.code}`;
  const qrUrl = `${base}/api/qr/${params.code}`;
  const firstName = params.name.split(/\s+/)[0] || params.name;

  const html = layout(
    "Tu pase de Encuentro Fester",
    `<h1 style="margin:0 0 12px;font-size:20px;">¡Listo, ${escapeHtml(firstName)}! Tu lugar está confirmado</h1>
     <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">Este es tu pase digital. Muestra el código QR en la entrada y en cada estación del evento: con él acumulas estrellas y canjeas tus promocionales.</p>
     <p style="margin:0 0 6px;text-align:center;"><img src="${qrUrl}" width="220" height="220" alt="Código QR de tu pase" style="border-radius:12px;border:1px solid #dde3ea;"></p>
     <p style="margin:0 0 20px;text-align:center;font-size:14px;color:#5b6b80;">Tu código: <strong style="letter-spacing:4px;color:${NAVY};">${params.code}</strong></p>
     <p style="margin:0 0 22px;text-align:center;">
       <a href="${passUrl}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:999px;">Abrir mi pase</a>
     </p>
     <p style="margin:0 0 8px;font-size:14px;line-height:1.6;"><strong>Cuándo:</strong> ${EVENT.dateLabel}<br>
     <strong>Dónde:</strong> ${VENUE.name}, ${EVENT.city}</p>
     <p style="margin:0;font-size:13px;line-height:1.6;color:#5b6b80;">Para ingresar necesitas tu pase y una identificación oficial. El registro es personal y no transferible. Si pierdes este correo, entra a <a href="${base}/mi-cuenta" style="color:${NAVY};">${base.replace(/^https?:\/\//, "")}/mi-cuenta</a> y recupera tu pase con tu correo.</p>`,
  );

  const text = `Listo, ${firstName}: tu lugar en ${EVENT.name} ${EVENT.year} esta confirmado.

Tu codigo de pase: ${params.code}
Abrir tu pase: ${passUrl}

Cuando: ${EVENT.dateLabel}
Donde: ${VENUE.name}, ${EVENT.city}

Para ingresar necesitas tu pase y una identificacion oficial.
Si pierdes este correo, recupera tu pase en ${base}/mi-cuenta
Dudas: ${CONTACT.email}`;

  return {
    to: params.to,
    subject: `Tu pase para ${EVENT.name} ${EVENT.year}`,
    html,
    text,
  };
}
