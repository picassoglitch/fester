import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { normalizeCode } from "@/lib/codes";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/site";

/**
 * QR del pase como PNG. Los clientes de correo bloquean las imagenes en
 * data:, asi que el correo de confirmacion apunta aqui.
 */
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code: raw } = await context.params;
  const code = normalizeCode(raw);

  const attendee = await prisma.attendee.findUnique({ where: { code }, select: { id: true } });
  if (!attendee) return new NextResponse("No encontrado", { status: 404 });

  const png = await QRCode.toBuffer(`${appUrl()}/s/${code}`, {
    type: "png",
    width: 440,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#04162e", light: "#ffffff" },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // El QR de un codigo nunca cambia: se puede cachear con tranquilidad.
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
