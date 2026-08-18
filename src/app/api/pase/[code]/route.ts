import { NextResponse } from "next/server";
import { getAttendeeProgress } from "@/lib/attendee";
import { normalizeCode } from "@/lib/codes";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const progress = await getAttendeeProgress(normalizeCode(code));
  if (!progress) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(progress, {
    headers: { "Cache-Control": "no-store" },
  });
}
