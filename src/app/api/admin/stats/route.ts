import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDashboardStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stats = await getDashboardStats();
  return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
}
