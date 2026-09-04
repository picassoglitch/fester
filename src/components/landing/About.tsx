import Icon from "@/components/landing/Icon";
import { ABOUT, FEATURES } from "@/lib/event";

/**
 * "¿Qué es Encuentro Fester?" + "Todo lo que encontrarás", con la misma
 * composicion del mockup: icono en circulo rojo junto al titulo, y en cada
 * recuadro el icono grande a la izquierda del titulo con el texto debajo.
 * Conserva el id #descripcion para que el menu siga apuntando aqui.
 */
export default function About() {
  return (
    <section id="descripcion" className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
      <div className="grid gap-8 lg:grid-cols-[3fr_7fr] lg:gap-10">
        <div className="panel relative overflow-hidden p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-brand text-white">
              <Icon name="building" className="h-9 w-9" strokeWidth={1.4} />
            </span>
            <h2 className="font-display text-3xl font-bold uppercase leading-[0.95] tracking-wide sm:text-4xl">
              {ABOUT.title}
            </h2>
          </div>
          <p className="mt-6 text-lg font-semibold leading-snug text-white">{ABOUT.lead}</p>
          <p className="mt-4 text-base leading-relaxed text-white/80">{ABOUT.body}</p>
          <p className="mt-5 border-t border-white/15 pt-4 text-sm font-medium leading-relaxed text-white/90">
            {ABOUT.closing}
          </p>
          <Icon
            name="building"
            className="pointer-events-none absolute -bottom-8 -right-6 h-44 w-44 text-white/[0.06]"
          />
        </div>

        <div className="flex flex-col">
          <h3 className="font-display text-base font-semibold uppercase tracking-[0.2em] text-white/85">
            {FEATURES.title}
          </h3>

          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {FEATURES.items.map((item) => (
              <li key={item.title} className="panel p-5">
                {/* Icono junto al titulo como en el mockup; en anchos medios se apila para que el titulo no se corte. */}
                <div className="flex items-center gap-3 sm:flex-col sm:items-start lg:flex-row lg:items-center">
                  <Icon
                    name={item.icon}
                    className="h-14 w-14 shrink-0 text-white"
                    strokeWidth={1.25}
                  />
                  <h4 className="font-display min-w-0 text-xl font-bold uppercase leading-none tracking-wide">
                    {item.title}
                  </h4>
                </div>
                {item.lead && (
                  <p className="mt-4 text-sm font-semibold leading-snug text-white">{item.lead}</p>
                )}
                {item.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-2 text-xs leading-relaxed text-white/75">
                    {paragraph}
                  </p>
                ))}
              </li>
            ))}
          </ul>

          <p className="mt-5 flex items-center gap-3 rounded-lg bg-gold px-5 py-4 text-base font-black uppercase leading-tight tracking-wide text-navy shadow-[0_14px_34px_-14px_rgba(245,179,1,0.9)] sm:text-lg">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-gold">
              <Icon name="user" className="h-5 w-5" />
            </span>
            {FEATURES.notice}
          </p>
        </div>
      </div>
    </section>
  );
}
