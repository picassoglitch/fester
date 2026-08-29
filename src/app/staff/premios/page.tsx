import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logout } from "@/app/actions/session";
import ScanConsole from "@/components/ScanConsole";

export const dynamic = "force-dynamic";

export default async function PrizesPage() {
  const [session, pendingPrizes, delivered] = await Promise.all([
    requireSession(),
    prisma.attendee.count({ where: { completedAt: { not: null }, redeemedAt: null } }),
    prisma.attendee.count({ where: { redeemedAt: { not: null } } }),
  ]);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Entrega de premios</h1>
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
    </main>
  );
}
