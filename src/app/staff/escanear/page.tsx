import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { normalizeCode } from "@/lib/codes";
import { getStaffStats } from "@/lib/staff-stats";
import { logout } from "@/app/actions/session";
import ScanConsole from "@/components/ScanConsole";
import StaffOverview from "@/components/StaffOverview";
import AutoRefresh from "@/components/AutoRefresh";
import FesterLogo from "@/components/FesterLogo";

export const dynamic = "force-dynamic";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const [{ code }, session] = await Promise.all([searchParams, requireSession()]);
  const stats = await getStaffStats(session.id);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5">
      <AutoRefresh seconds={30} />

      <header className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-sky/12 pb-4">
        <FesterLogo className="h-7" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-tight">Escanear pases</h1>
          <p className="text-xs text-white/50">
            {session.name} · {session.role === "ADMIN" ? "administrador" : "staff"}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/staff/premios" className="text-white/60 underline underline-offset-4">
            Premios
          </Link>
          {session.role === "ADMIN" && (
            <Link href="/admin" className="text-white/60 underline underline-offset-4">
              Panel
            </Link>
          )}
          <form action={logout}>
            <button type="submit" className="text-white/60 underline underline-offset-4">
              Salir
            </button>
          </form>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,24rem)_1fr] lg:items-start">
        {/* min-w-0: sin esto el select y el escáner estiran la columna del grid. */}
        <div className="min-w-0">
          {stats.stations.length === 0 ? (
            <p className="card p-5 text-center text-sm text-white/60">
              No hay estaciones activas. Pide al administrador que las cree en el panel.
            </p>
          ) : (
            <ScanConsole
              stations={stats.stations.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji }))}
              staffName={session.name}
              mode="estacion"
              initialCode={code ? normalizeCode(code) : undefined}
            />
          )}
        </div>

        <div className="min-w-0">
          <StaffOverview stats={stats} />
        </div>
      </div>
    </main>
  );
}
