import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { normalizeCode } from "@/lib/codes";
import { canRedeemPrizes, staffHomeWithCode } from "@/lib/roles";
import { logout } from "@/app/actions/session";
import ScanConsole from "@/components/ScanConsole";
import AutoRefresh from "@/components/AutoRefresh";
import FesterLogo from "@/components/FesterLogo";

export const dynamic = "force-dynamic";

export default async function PrizesPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const [{ code }, session, pendingPrizes, delivered] = await Promise.all([
    searchParams,
    requireSession(),
    prisma.attendee.count({ where: { completedAt: { not: null }, redeemedAt: null } }),
    prisma.attendee.count({ where: { redeemedAt: { not: null } } }),
  ]);
  // Escaneo no entrega premios: va a su pantalla con el pase precargado.
  if (!canRedeemPrizes(session.role)) {
    redirect(staffHomeWithCode(session.role, code ? normalizeCode(code) : null));
  }

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
          {session.role === "ADMIN" && (
            <Link href="/staff/escanear" className="text-white/60 underline underline-offset-4">
              Estaciones
            </Link>
          )}
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

      {/* ?code= solo precarga el pase: el staff confirma con "Entregar premio". */}
      <ScanConsole
        stations={[]}
        staffName={session.name}
        mode="premio"
        showModeLink={session.role === "ADMIN"}
        initialCode={code ? normalizeCode(code) : undefined}
      />
    </main>
  );
}
