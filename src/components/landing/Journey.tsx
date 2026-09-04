import Icon from "@/components/landing/Icon";
import JourneyArt from "@/components/landing/JourneyArt";
import { JOURNEY } from "@/lib/event";

/**
 * "Tu recorrido": replica de la infografia de marca. Cuatro pasos numerados
 * unidos por una linea con puntos luminosos, ilustraciones con acentos rojos
 * y el cierre sobre el QR. La seccion usa el navy profundo de la pieza.
 */
export default function Journey() {
  return (
    <section
      id="recorrido"
      className="border-y border-white/10 bg-[#071b40] [--journey-card:#0b2757] bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgba(47,123,224,0.35),transparent_70%)]"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
        <div className="text-center">
          <p className="flex items-center justify-center gap-3 text-sm font-semibold uppercase tracking-[0.25em] text-brand">
            <span aria-hidden className="h-px w-5 bg-brand" />
            {JOURNEY.eyebrow}
            <span aria-hidden className="h-px w-5 bg-brand" />
          </p>
          <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">
            {JOURNEY.title}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-base text-white/85 sm:text-lg">{JOURNEY.lead}</p>
        </div>

        <ol className="relative mt-16 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {/* Linea que une los numeros, solo cuando los cuatro pasos van en fila. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-0 hidden -translate-y-1/2 lg:block"
          >
            <div className="h-px w-full bg-[#6aa6ff]/60" />
            {["25%", "50%", "75%"].map((left) => (
              <span
                key={left}
                style={{ left }}
                className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9fd0ff] shadow-[0_0_14px_3px_rgba(120,190,255,0.9)]"
              />
            ))}
          </div>

          {JOURNEY.steps.map((step, index) => (
            <li
              key={step.title}
              className="relative flex flex-col rounded-2xl border border-[#6aa6ff]/45 bg-[var(--journey-card)] px-6 pb-7 pt-14 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)]"
            >
              {/* Numero con anillo rojo y azul, como en la pieza. */}
              <span className="absolute left-1/2 top-0 flex h-[3.75rem] w-[3.75rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[conic-gradient(from_210deg,#e2001a_0_55%,#2f7be0_55%_100%)] p-[3px] shadow-[0_0_0_6px_#071b40,0_0_22px_2px_rgba(47,123,224,0.55)]">
                <span className="flex h-full w-full items-center justify-center rounded-full bg-[#071b40] text-[1.75rem] font-bold leading-none text-white">
                  {index + 1}
                </span>
              </span>

              <JourneyArt name={step.art} className="h-24 w-24 text-white" />
              <h3 className="mt-5 text-lg font-bold leading-snug text-balance">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/85">{step.copy}</p>
              {step.divider && <span aria-hidden className="mt-4 block h-0.5 w-10 bg-brand" />}

              {step.bullets && (
                <ul className="mt-4 space-y-2.5">
                  {step.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-3 text-sm leading-snug text-white/90"
                    >
                      <span aria-hidden className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}

              {step.chips && (
                <ul className="mt-4 space-y-2.5">
                  {step.chips.map((chip) => (
                    <li
                      key={chip.label}
                      className="flex items-center gap-3 rounded-full border border-[#6aa6ff]/55 bg-white/[0.04] px-4 py-2 text-sm font-medium"
                    >
                      <Icon name={chip.icon} className="h-5 w-5 shrink-0 text-white" />
                      {chip.label}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>

        <p className="mt-12 flex flex-col items-center gap-5 rounded-2xl border border-[#6aa6ff]/45 bg-[var(--journey-card)] px-6 py-6 text-center sm:flex-row sm:px-8 sm:text-left">
          <JourneyArt name="shield" className="h-16 w-16 shrink-0 text-white" />
          <span className="hidden h-12 w-px bg-[#6aa6ff]/45 sm:block" aria-hidden />
          <span className="text-lg font-bold leading-snug sm:text-xl">{JOURNEY.footer}</span>
        </p>
      </div>
    </section>
  );
}
