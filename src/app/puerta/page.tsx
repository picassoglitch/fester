import type { Metadata } from "next";
import Link from "next/link";
import { isValidDoorToken } from "@/lib/door-token";
import { REGISTRATION_CLOSED } from "@/lib/event";
import DoorSelfSignup from "@/components/DoorSelfSignup";
import FesterLogo from "@/components/FesterLogo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registro en la entrada",
  robots: { index: false, follow: false },
};

export default async function DoorSelfSignupPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const valid = await isValidDoorToken(t);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-6 px-5 py-8">
      <header className="flex flex-col items-center text-center">
        <FesterLogo className="h-9" />
        <h1 className="mt-4 text-2xl font-bold">{valid ? "Registro en la entrada" : REGISTRATION_CLOSED.banner}</h1>
        {valid && <p className="mt-2 text-sm text-white/60">Llena tus datos y te mostramos tu pase al momento.</p>}
      </header>

      <section className="card p-5">
        {valid && t ? (
          <DoorSelfSignup token={t} />
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-white/80">{REGISTRATION_CLOSED.detail}</p>
            <Link href="/mi-cuenta" className="btn btn-primary w-full py-3">
              {REGISTRATION_CLOSED.cta}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
