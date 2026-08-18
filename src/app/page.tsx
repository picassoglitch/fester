import Link from "next/link";
import { prisma } from "@/lib/db";
import RegisterForm from "@/components/RegisterForm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stations = await prisma.station.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, emoji: true },
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-5 py-10">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-grape">Fester</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
          Junta tus estrellas{" "}
          <span className="inline-block animate-pop text-star">★</span>
        </h1>
        <p className="mt-3 text-balance text-sm leading-relaxed text-white/60 sm:text-base">
          Crea tu pase, muestra tu código QR en cada estación y reclama tu premio al completar el
          recorrido.
        </p>
      </header>

      {stations.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-2">
          {stations.map((station) => (
            <li
              key={station.id}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70"
            >
              <span className="mr-1">{station.emoji}</span>
              {station.name}
            </li>
          ))}
        </ul>
      )}

      <section className="card p-5 sm:p-6">
        <RegisterForm />
      </section>

      <div className="text-center text-sm">
        <Link href="/pase" className="text-white/55 underline underline-offset-4 hover:text-white">
          Ya tengo un pase
        </Link>
        <span className="mx-2 text-white/20">·</span>
        <Link href="/staff" className="text-white/55 underline underline-offset-4 hover:text-white">
          Acceso staff
        </Link>
      </div>
    </main>
  );
}
