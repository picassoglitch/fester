import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { canRecordStations, staffHome } from "@/lib/roles";
import { CAPACITY, INSIDE } from "@/lib/access";
import { prisma } from "@/lib/db";
import { logout } from "@/app/actions/session";
import AccessConsole from "@/components/AccessConsole";
import AutoRefresh from "@/components/AutoRefresh";
import FesterLogo from "@/components/FesterLogo";

export const dynamic = "force-dynamic";

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ puerta?: string }>;
}) {
  const [{ puerta }, session] = await Promise.all([searchParams, requireSession()]);
  const initialKind = puerta === "ENTRY" || puerta === "EXIT" ? puerta : undefined;
  if (!canRecordStations(session.role)) redirect(staffHome(session.role));
  const inside = await prisma.attendee.count({ where: INSIDE });

  return (
    <main className="mx-auto w-full max-w-md px-4 py-5">
      {/* Varias puertas a la vez: el conteo se refresca solo. */}
      <AutoRefresh seconds={10} />
      <header className="mb-5 flex items-center gap-4 border-b border-sky/12 pb-4">
        <FesterLogo className="h-7" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-tight">Acceso al foro</h1>
          <p className="text-xs text-white/50">{session.name}</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/staff/escanear" className="text-white/60 underline underline-offset-4">
            Estaciones
          </Link>
          {session.role === "ADMIN" && (
            <Link href="/admin/aforo" className="text-white/60 underline underline-offset-4">
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
      <AccessConsole
        inside={inside}
        capacity={CAPACITY}
        staffName={session.name}
        initialKind={initialKind}
        showStationsLink
      />
    </main>
  );
}
