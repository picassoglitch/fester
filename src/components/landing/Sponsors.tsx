import { SPONSORS } from "@/lib/event";

export default function Sponsors() {
  return (
    <section id="patrocinadores" className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
      <div className="text-center">
        <p className="eyebrow justify-center">Patrocinadores</p>
        <h2 className="mt-4 text-3xl font-black uppercase leading-[0.95] sm:text-4xl">
          Marcas que respaldan el encuentro
        </h2>
      </div>

      <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {SPONSORS.map((sponsor) => (
          <li
            key={sponsor.name}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-sky/15 bg-ink-soft/50 px-4 py-7 text-center"
          >
            <span className="text-lg font-black uppercase tracking-wide text-white/85">
              {sponsor.name}
            </span>
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-brand">
              {sponsor.note}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
