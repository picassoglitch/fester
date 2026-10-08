import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logout } from "@/app/actions/session";
import ScanConsole from "@/components/ScanConsole";
import AutoRefresh from "@/components/AutoRefresh";
import FesterLogo from "@/components/FesterLogo";
import { getPendingPrizeDesk } from "@/lib/prizes";

export const dynamic = "force-dynamic";

export default async function PrizesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const [session, pendingPrizes, delivered, pendingList] = await Promise.all([
    requireSession(),
    prisma.attendee.count({ where: { completedAt: { not: null }, redeemedAt: null } }),
    prisma.attendee.count({ where: { redeemedAt: { not: null } } }),
    // Solo nombre y codigo: en la mesa no hace falta ver datos de contacto.
    getPendingPrizeDesk(q),
  ]);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <AutoRefresh seconds={30} />
      <header className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-sky/12 pb-4">
        <FesterLogo className="h-7" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-tight">Entrega de premios</h1>
          <p className="text-xs text-white/50">Sesión de {session.name}</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/staff/escanear" className="text-white/60 underline underline-offset-4">
            Estaciones
          </Link>
          <form action={logout}>
            <button type="submit" className="text-white/60 underline underline-offset-4">
              Salir
            </button>
          </form>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-white/50">Por entregar</p>
          <p className="text-2xl font-bold text-gold">{pendingPrizes}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-white/50">Entregados</p>
          <p className="text-2xl font-bold text-success">{delivered}</p>
        </div>
      </div>

      <ScanConsole stations={[]} staffName={session.name} mode="premio" />

      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold text-white/70">Pendientes por entregar</h2>
        <form className="flex gap-2" action="/staff/premios">
          <input
            name="q"
            defaultValue={q}
            className="field flex-1"
            placeholder="Buscar por nombre o código"
          />
          <button type="submit" className="btn btn-ghost px-4">
            Buscar
          </button>
        </form>
        <ul className="card divide-y divide-white/8 text-sm">
          {pendingList.rows.length === 0 && (
            <li className="px-4 py-4 text-center text-white/45">
              {q ? "Sin resultados." : "No hay premios pendientes."}
            </li>
          )}
          {pendingList.rows.map((row) => (
            <li key={row.code} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0 truncate">{row.name}</span>
              <span className="font-mono text-xs tracking-widest text-white/60">{row.code}</span>
            </li>
          ))}
        </ul>
        {pendingList.total > pendingList.rows.length && (
          <p className="text-xs text-white/45">
            Mostrando {pendingList.rows.length} de {pendingList.total}. Busca para encontrar a alguien.
          </p>
        )}
      </section>
    </main>
  );
}
