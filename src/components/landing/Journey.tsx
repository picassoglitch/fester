import Icon from "@/components/landing/Icon";
import { JOURNEY } from "@/lib/event";

/**
 * "Tu recorrido": los cuatro pasos de la infografia de marca, del registro a
 * las actividades, con la linea que une los numeros y el cierre sobre el QR.
 */
export default function Journey() {
  return (
    <section id="recorrido" className="border-y border-white/10 bg-navy/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
        <div className="text-center">
          <p className="font-display flex items-center justify-center gap-3 text-base font-semibold uppercase tracking-[0.3em] text-brand">
            <span aria-hidden className="h-px w-6 bg-brand" />
            {JOURNEY.eyebrow}
            <span aria-hidden className="h-px w-6 bg-brand" />
          </p>
          <h2 className="font-display mt-4 text-4xl font-bold leading-none tracking-wide text-balance sm:text-5xl">
            {JOURNEY.title}
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-base text-white/80">{JOURNEY.lead}</p>
        </div>

        <ol className="relative mt-14 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Linea que une los numeros, solo cuando los cuatro pasos van en fila. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-0 hidden -translate-y-1/2 lg:block"
          >
            <div className="h-px w-full bg-white/30" />
            {["25%", "50%", "75%"].map((left) => (
              <span
                key={left}
                style={{ left }}
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky shadow-[0_0_12px_2px_rgba(159,208,255,0.8)]"
              />
            ))}
          </div>

          {JOURNEY.steps.map((step, index) => (
            <li key={step.title} className="panel relative flex flex-col px-5 pb-6 pt-12">
              <span className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-brand bg-navy text-2xl font-black text-white shadow-[0_0_0_6px_rgba(0,42,82,1)]">
                {index + 1}
              </span>
              <Icon name={step.icon} className="h-16 w-16 text-white" strokeWidth={1.25} />
              <h3 className="font-display mt-4 text-2xl font-bold leading-none tracking-wide text-balance">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">{step.copy}</p>

              {step.bullets && (
                <ul className="mt-4 space-y-2 border-t border-white/15 pt-4">
                  {step.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2.5 text-sm leading-snug text-white/85"
                    >
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}

              {step.chips && (
                <ul className="mt-4 space-y-2">
                  {step.chips.map((chip) => (
                    <li
                      key={chip.label}
                      className="flex items-center gap-3 rounded-full border border-white/30 bg-white/5 px-4 py-2 text-sm font-medium"
                    >
                      <Icon name={chip.icon} className="h-5 w-5 shrink-0 text-sky" />
                      {chip.label}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>

        <p className="mt-10 flex flex-col items-center gap-4 rounded-xl border border-white/20 bg-ink-soft/60 px-6 py-5 text-center sm:flex-row sm:text-left">
          <Icon name="shieldlock" className="h-12 w-12 shrink-0 text-white" strokeWidth={1.25} />
          <span className="hidden h-10 w-px bg-white/20 sm:block" aria-hidden />
          <span className="text-base font-bold leading-snug sm:text-lg">{JOURNEY.footer}</span>
        </p>
      </div>
    </section>
  );
}
