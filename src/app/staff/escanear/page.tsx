import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { normalizeCode } from "@/lib/codes";
import { logout } from "@/app/actions/session";
import ScanConsole from "@/components/ScanConsole";

export const dynamic = "force-dynamic";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const [{ code }, session, stations] = await Promise.all([
    searchParams,
    requireSession(),
    prisma.station.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, emoji: true },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Escanear pases</h1>
          <p className="text-xs text-white/50">Sesión de {session.name}</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
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

      {stations.length === 0 ? (
        <p className="card p-5 text-center text-sm text-white/60">
          No hay estaciones activas. Pide al administrador que las cree en el panel.
        </p>
      ) : (
        <ScanConsole
          stations={stations}
          staffName={session.name}
          mode="estacion"
          initialCode={code ? normalizeCode(code) : undefined}
        />
      )}
    </main>
  );
}
