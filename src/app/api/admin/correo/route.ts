import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { CONTACT, EVENT, supportEmail } from "@/lib/event";
import { mailFrom, mailReplyTo, sendMail } from "@/lib/mail";
import { appUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Diagnostico del correo, solo para admin.
 *
 * GET /api/admin/correo             -> como quedo la configuracion en este despliegue
 * GET /api/admin/correo?to=x@y.mx   -> ademas manda un correo de prueba y devuelve
 *                                      tal cual lo que contesto Resend
 *
 * Existe porque cuando Resend rechaza un envio la persona que se registra solo
 * ve "no pudimos enviar el correo": el motivo real (dominio sin verificar, API
 * key de otro entorno, remitente que no cuadra) queda en los logs del servidor
 * y asi se puede leer sin entrar a buscarlos.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY ?? "";
  const config = {
    // Nunca la llave: solo si llego y con que forma, que es lo que suele fallar.
    resendApiKey: apiKey
      ? { presente: true, largo: apiKey.length, empiezaCon: apiKey.slice(0, 3) }
      : { presente: false },
    from: mailFrom(),
    replyTo: mailReplyTo(),
    correoDelEvento: CONTACT.email,
    correoDeSoporte: supportEmail(),
    appUrl: appUrl(),
    entorno: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  };

  const to = new URL(request.url).searchParams.get("to")?.trim() ?? "";
  if (!to) {
    return NextResponse.json({
      config,
      ayuda: "Agrega ?to=tucorreo@dominio.com para mandar un correo de prueba.",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ config, error: "El correo de prueba no es válido." }, { status: 400 });
  }

  const result = await sendMail({
    to,
    subject: `Prueba de envío · ${EVENT.name} ${EVENT.year}`,
    html: `<p>Si estás leyendo esto, el envío de correos del sitio funciona.</p>
           <p style="color:#5b6b80;font-size:13px;">Enviado desde ${config.appUrl} (${config.entorno}).</p>`,
    text: `Si estas leyendo esto, el envio de correos del sitio funciona.\nEnviado desde ${config.appUrl} (${config.entorno}).`,
  });

  return NextResponse.json({ config, resultado: result }, { status: result.ok ? 200 : 502 });
}
