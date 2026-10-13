import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMapSnapshot } from "@/lib/map";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const snapshot = await getMapSnapshot();
  return NextResponse.json(snapshot, { headers: { "Cache-Control": "no-store" } });
}
