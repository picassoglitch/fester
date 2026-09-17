import Link from "next/link";
import type { Metadata } from "next";
import { resendPassEmail, signOutAttendee } from "@/app/actions/account";
import AccountLogin from "@/components/AccountLogin";
import FesterLogo from "@/components/FesterLogo";
import { getAttendeeProgress } from "@/lib/attendee";
import { clearAttendeeSessionCookie, getAttendeeSession } from "@/lib/auth";
import { supportEmail } from "@/lib/event";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi cuenta",
};

/**
 * Punto de regreso para quien ya se registro: entra con su correo, recupera su
 * pase y lo reenvia si lo perdio. La sesion vive en una cookie firmada.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string }>;
}) {
  const { enviado } = await searchParams;
  const session = await getAttendeeSession();
  const progress = session ? await getAttendeeProgress(session.code) : null;

  // La sesion apunta a un pase que ya no existe: se cierra y se pide el correo.
  if (session && !progress) await clearAttendeeSessionCookie();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-5 py-10">
      <header className="flex flex-col items-center text-center">
        <FesterLogo className="h-9" />
        <h1 className="mt-4 text-2xl font-bold">
          {progress ? `Hola, ${progress.name.split(" ")[0]}` : "Mi cuenta"}
        </h1>
        <p className="mt-2 text-sm text-white/60">
          {progress
            ? "Tu registro está confirmado. Este es tu acceso al evento."
            : "Entra con el correo que usaste al registrarte y te enviamos un código."}
        </p>
      </header>

      {enviado === "si" && (
        <p className="rounded-lg border border-success/50 bg-success/15 px-4 py-3 text-sm text-white">
          Te reenviamos tu pase por correo.
        </p>
      )}
      {enviado === "no" && (
        <p className="rounded-lg border border-alert/50 bg-alert/15 px-4 py-3 text-sm text-white">
          No pudimos reenviar el correo. Escríbenos a {supportEmail()}.
        </p>
      )}

      {progress ? (
        <>
          <div className="card space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-white/60">Código de pase</span>
              <span className="font-mono text-lg tracking-[0.35em]">{progress.code}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-white/60">Correo</span>
              <span className="truncate text-sm">{progress.email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-white/60">Registro</span>
              <span className="text-sm">{formatDateTime(progress.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-white/60">Estrellas</span>
              <span className="text-sm">
                <span className="text-gold">★</span> {progress.stars} / {progress.total}
              </span>
            </div>
          </div>

          <Link href={`/pase/${progress.code}`} className="btn btn-primary w-full">
            Ver mi pase con QR
          </Link>

          <form action={resendPassEmail}>
            <button type="submit" className="btn btn-ghost w-full">
              Reenviar mi pase por correo
            </button>
          </form>

          <form action={signOutAttendee}>
            <button
              type="submit"
              className="w-full text-center text-sm text-white/50 underline underline-offset-4 hover:text-white"
            >
              Cerrar sesión
            </button>
          </form>
        </>
      ) : (
        <AccountLogin />
      )}

      <p className="text-center text-xs text-white/40">
        ¿Necesitas ayuda?{" "}
        <a href={`mailto:${supportEmail()}`} className="underline underline-offset-4">
          {supportEmail()}
        </a>
      </p>
    </main>
  );
}
