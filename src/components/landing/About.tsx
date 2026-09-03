import Icon from "@/components/landing/Icon";
import { ABOUT, FEATURES } from "@/lib/event";

/**
 * "¿Qué es Encuentro Fester?" + "Todo lo que encontrarás".
 * Conserva el id #descripcion para que el menu siga apuntando aqui.
 */
export default function About() {
  return (
    <section id="descripcion" className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
      <div className="grid gap-8 lg:grid-cols-[2fr_3fr] lg:gap-10">
        <div className="panel relative overflow-hidden p-6 sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-sky/25 bg-navy/40 text-sky">
            <Icon name="building" className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-3xl font-black uppercase leading-[0.95] tracking-tight sm:text-4xl">
            {ABOUT.title}
          </h2>
          <div className="mt-5 space-y-4">
            {ABOUT.paragraphs.map((paragraph, index) => (
              <p
                key={paragraph}
                className={
                  index === 0
                    ? "text-base leading-relaxed text-white/80"
                    : "text-base font-semibold leading-relaxed text-white"
                }
              >
                {paragraph}
              </p>
            ))}
          </div>
          <Icon
            name="building"
            className="pointer-events-none absolute -bottom-8 -right-6 h-44 w-44 text-sky/[0.07]"
          />
        </div>

        <div className="flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-white/85">
            {FEATURES.title}
          </h3>

          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {FEATURES.items.map((item) => (
              <li key={item.title} className="panel flex flex-col p-5">
                <Icon name={item.icon} className="h-9 w-9 text-sky" />
                <h4 className="mt-4 text-sm font-black uppercase leading-tight tracking-wide">
                  {item.title}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-white/65">{item.copy}</p>
              </li>
            ))}
          </ul>

          <p className="mt-5 flex items-center gap-3 rounded-lg border border-sky/25 bg-navy/40 px-5 py-4 text-sm font-semibold sm:mt-auto">
            <Icon name="alert" className="h-6 w-6 shrink-0 text-brand" />
            {FEATURES.notice}
          </p>
        </div>
      </div>
    </section>
  );
}
