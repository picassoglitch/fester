import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { EVENT } from "@/lib/event";
import { mailFrom, mailReplyTo, sendMail } from "@/lib/mail";
import { appUrl } from "@/lib/site";
import { consumeRateLimit } from "@/lib/throttle";

export const dynamic = "force-dynamic";

const MAIL_TEST_LIMIT = 5;
const MAIL_TEST_WINDOW_MS = 60 * 60_000;

/**
 * Correo de prueba, solo para admin. Existe porque cuando Resend rechaza un
 * envio la persona que se registra solo ve "no pudimos enviar el correo"; el
 * motivo completo queda en los logs del servidor ([mail] …).
 *
 * Solo POST con JSON y Origin propio: un GET que manda correo se podia
 * disparar desde otro sitio con la cookie Lax. No expone nada de la API key.
 *
 *   curl -X POST https://<dominio>/api/admin/correo \
 *     -H "Origin: https://<dominio>" -H "Content-Type: application/json" \
 *     -b "fester_session=<TOKEN>" -d '{"to":"tucorreo@dominio.com"}'
 */
export function GET() {
  return NextResponse.json(
    { error: "method_not_allowed" },
    { status: 405, headers: { Allow: "POST" } },
  );
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set([new URL(request.url).origin]);
  try {
    allowed.add(new URL(appUrl()).origin);
  } catch {
    /* NEXT_PUBLIC_APP_URL mal formada: solo vale el origen de la peticion */
  }
  return allowed.has(origin);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!sameOrigin(request) || !contentType.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let to = "";
  try {
    const body = (await request.json()) as { to?: unknown };
    to = typeof body.to === "string" ? body.to.trim() : "";
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "El correo de prueba no es válido." }, { status: 400 });
  }

  const limit = await consumeRateLimit(`mail-test:${session.id}`, MAIL_TEST_LIMIT, MAIL_TEST_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiados correos de prueba. Intenta en una hora." },
      { status: 429 },
    );
  }

  const entorno = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
  const sent = await sendMail({
    to,
    subject: `Prueba de envío · ${EVENT.name} ${EVENT.year}`,
    html: `<p>Si estás leyendo esto, el envío de correos del sitio funciona.</p>
           <p style="color:#5b6b80;font-size:13px;">Enviado desde ${appUrl()} (${entorno}).</p>`,
    text: `Si estas leyendo esto, el envio de correos del sitio funciona.\nEnviado desde ${appUrl()} (${entorno}).`,
  });

  const resultado = sent.ok
    ? { ok: true }
    : { ok: false, ...(sent.status ? { status: sent.status } : {}), error: sent.error };

  return NextResponse.json(
    { ok: sent.ok, resultado, from: mailFrom(), replyTo: mailReplyTo(), entorno },
    { status: sent.ok ? 200 : 502 },
  );
}
