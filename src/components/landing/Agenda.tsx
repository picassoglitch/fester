import Icon from "@/components/landing/Icon";
import SectionTitle from "@/components/landing/SectionTitle";
import { AGENDA } from "@/lib/event";

/**
 * Cuatro bloques sin horario: texto a la izquierda e icono a la derecha,
 * centrado verticalmente, para que los iconos queden alineados entre tarjetas.
 */
export default function Agenda() {
  return (
    <section id="agenda" className="border-y border-white/10 bg-ink-soft/40 blueprint">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
        <SectionTitle>{AGENDA.title}</SectionTitle>

        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AGENDA.items.map((item) => (
            <li key={item.title} className="panel flex items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl font-bold uppercase leading-none tracking-wide">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-white/75">{item.copy}</p>
              </div>
              <Icon
                name={item.icon}
                className="h-12 w-12 shrink-0 text-white/90"
                strokeWidth={1.25}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
