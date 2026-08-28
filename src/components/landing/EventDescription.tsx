import { DESCRIPTION } from "@/lib/event";

/**
 * Sustituye a la sección de agenda / programa del evento:
 * el diseño aprobado pide una descripción del evento en su lugar.
 */
export default function EventDescription() {
  return (
    <section id="descripcion" className="border-y border-sky/10 bg-ink-soft/35 blueprint">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow">Descripción</p>
            <h2 className="mt-4 text-3xl font-black uppercase leading-[0.95] sm:text-4xl">
              {DESCRIPTION.title}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/75">{DESCRIPTION.lead}</p>
            <dl className="mt-8 grid grid-cols-2 gap-4">
              {DESCRIPTION.facts.map((fact) => (
                <div key={fact.label} className="rounded-lg border border-sky/15 bg-ink/50 p-4">
                  <dt className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-brand">
                    {fact.label}
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-white/85">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <div className="space-y-4">
              {DESCRIPTION.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-base leading-relaxed text-white/70">
                  {paragraph}
                </p>
              ))}
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {DESCRIPTION.highlights.map((item) => (
                <li key={item.title} className="card p-5">
                  <span aria-hidden className="text-2xl">
                    {item.emoji}
                  </span>
                  <h3 className="mt-3 text-sm font-bold uppercase tracking-wide">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60">{item.copy}</p>
                </li>
              ))}
            </ul>

            <a href="#registro" className="btn btn-primary mt-8 uppercase tracking-wide">
              Reserva tu lugar <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
