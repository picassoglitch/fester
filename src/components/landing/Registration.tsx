import RegisterForm from "@/components/RegisterForm";
import { BENEFITS, EVENT } from "@/lib/event";

export type StationChip = { id: string; name: string; emoji: string };

export default function Registration({ stations = [] }: { stations?: StationChip[] }) {
  return (
    <section id="registro" className="border-y border-sky/10 bg-ink-soft/45 blueprint">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <p className="eyebrow">Registro</p>
          <h2 className="mt-4 text-3xl font-black uppercase leading-[0.95] sm:text-4xl">
            Asegura
            <br />
            tu lugar
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/65">
            {EVENT.registrationDeadline}. Regístrate hoy y sé parte de la experiencia Fester el{" "}
            {EVENT.dateShort} en {EVENT.city}.
          </p>

          <ul className="mt-8 grid grid-cols-3 gap-4 lg:max-w-sm">
            {BENEFITS.map((benefit) => (
              <li key={benefit.title} className="text-xs leading-snug text-white/70">
                <span aria-hidden className="mb-2 block text-2xl">
                  {benefit.emoji}
                </span>
                {benefit.title}
                <br />
                {benefit.copy}
              </li>
            ))}
          </ul>

          {stations.length > 0 && (
            <div className="mt-8">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand">
                Estaciones del recorrido
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {stations.map((station) => (
                  <li
                    key={station.id}
                    className="rounded-full border border-sky/20 bg-ink/50 px-3 py-1.5 text-xs text-white/70"
                  >
                    <span aria-hidden className="mr-1">
                      {station.emoji}
                    </span>
                    {station.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-sky/15 bg-ink/40 p-5 sm:p-7">
          <RegisterForm />
        </div>
      </div>
    </section>
  );
}
