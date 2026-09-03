import Icon from "@/components/landing/Icon";
import SectionTitle from "@/components/landing/SectionTitle";
import { AGENDA } from "@/lib/event";

export default function Agenda() {
  return (
    <section id="agenda" className="border-y border-white/10 bg-ink-soft/40 blueprint">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
        <SectionTitle>{AGENDA.title}</SectionTitle>

        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AGENDA.items.map((item) => (
            <li key={item.title} className="panel flex flex-col p-5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky">
                <Icon name="clock" className="h-4 w-4" />
                <time>{item.time}</time>
              </p>
              <h3 className="mt-3 text-base font-black uppercase leading-tight tracking-wide">
                {item.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-white/75">{item.copy}</p>
              <Icon name={item.icon} className="mt-6 h-10 w-10 self-end text-white/80" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
