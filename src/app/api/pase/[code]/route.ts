import { NextResponse } from "next/server";
import { getPublicPassProgress } from "@/lib/attendee";
import { normalizeCode } from "@/lib/codes";

export const dynamic = "force-dynamic";

// Sin sesion: solo la forma publica del pase (sin correo, telefono ni ids).
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const progress = await getPublicPassProgress(normalizeCode(code));
  if (!progress) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(progress, {
    headers: { "Cache-Control": "no-store" },
  });
}
