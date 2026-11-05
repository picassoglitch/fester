import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { canRecordStations, staffHome } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { CAPACITY, INSIDE } from "@/lib/access";
import { createDoorToken, DOOR_SIGNUP_UNTIL } from "@/lib/door-token";
import { appUrl } from "@/lib/site";
import { logout } from "@/app/actions/session";
import DoorRegister from "@/components/DoorRegister";
import QrCode from "@/components/QrCode";
import FesterLogo from "@/components/FesterLogo";

export const dynamic = "force-dynamic";

export default async function DoorRegisterPage() {
  const session = await requireSession();
  if (!canRecordStations(session.role)) redirect(staffHome(session.role));

  const [inside, token] = await Promise.all([prisma.attendee.count({ where: INSIDE }), createDoorToken()]);
  const selfSignupUrl = `${appUrl()}/puerta?t=${encodeURIComponent(token)}`;
  const qrActive = Date.now() < DOOR_SIGNUP_UNTIL.getTime();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5">
      <header className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-sky/12 pb-4">
        <FesterLogo className="h-7" />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-tight">Registro en la puerta</h1>
          <p className="text-xs text-white/50">
            {session.name} · Dentro del foro: {inside}/{CAPACITY}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link href="/staff/escanear" className="text-white/60 underline underline-offset-4">
            Escanear
          </Link>
          <form action={logout}>
            <button type="submit" className="text-white/60 underline underline-offset-4">
              Salir
            </button>
          </form>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start">
        <section className="card min-w-0 p-5">
          <h2 className="mb-1 text-base font-bold">Registrar a quien llega</h2>
          <p className="mb-4 text-xs text-white/55">Se crea el pase, se marca la Entrada y no entra a la rifa.</p>
          <DoorRegister capacity={CAPACITY} />
        </section>

        <section className="card min-w-0 p-5 text-center">
          <h2 className="text-base font-bold">O que se registre en su teléfono</h2>
          {qrActive ? (
            <>
              <p className="mt-1 text-xs text-white/55">
                Escanea este QR, llena correo, nombre y puesto y te muestra tu pase. Después escanéalo en Registro.
              </p>
              <div className="mx-auto mt-4 w-full max-w-[360px]">
                <QrCode value={selfSignupUrl} size={360} className="aspect-square h-auto w-full" />
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-white/60">El QR de registro solo vale el día del evento.</p>
          )}
        </section>
      </div>
    </main>
  );
}
