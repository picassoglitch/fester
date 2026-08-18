import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PinLogin from "@/components/PinLogin";

export const dynamic = "force-dynamic";

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const session = await getSession();
  const target = next && next.startsWith("/") ? next : "/staff/escanear";

  if (session) redirect(target);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-grape">Fester</p>
        <h1 className="mt-2 text-2xl font-bold">Acceso staff</h1>
        <p className="mt-2 text-sm text-white/55">Ingresa tu PIN personal.</p>
      </header>

      <section className="card p-5">
        <PinLogin next={target} />
      </section>
    </main>
  );
}
