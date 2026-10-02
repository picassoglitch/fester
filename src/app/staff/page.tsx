import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { postLoginTarget, safeNextPath } from "@/lib/safe-redirect";
import PinLogin from "@/components/PinLogin";
import FesterLogo from "@/components/FesterLogo";

export const dynamic = "force-dynamic";

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const session = await getSession();
  const target = safeNextPath(next);

  if (session) redirect(postLoginTarget(target, session.role));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <header className="flex flex-col items-center text-center">
        <FesterLogo className="h-9" />
        <h1 className="mt-4 text-2xl font-bold">Acceso staff</h1>
        <p className="mt-2 text-sm text-white/55">Ingresa tu PIN personal.</p>
      </header>

      <section className="card p-5">
        <PinLogin next={target} />
      </section>
    </main>
  );
}
