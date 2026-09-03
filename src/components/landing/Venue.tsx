import Icon from "@/components/landing/Icon";
import SectionTitle from "@/components/landing/SectionTitle";
import { DIRECTIONS, VENUE } from "@/lib/event";

export default function Venue() {
  return (
    <section id="sede" className="border-y border-sky/10 bg-ink-soft/35 blueprint">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[2fr_3fr]">
        <div>
          <SectionTitle icon="pin">{VENUE.title}</SectionTitle>
          <div className="panel mt-6 flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:p-7">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-sky/30 bg-navy/50 text-sky">
              <Icon name="pin" className="h-8 w-8" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-black uppercase leading-tight tracking-tight">
                {VENUE.name},
                <br />
                {VENUE.city}
              </p>
              <p className="mt-1.5 text-sm text-white/60">{VENUE.address}</p>
              <a
                href={VENUE.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary mt-5 px-6 py-3 text-sm uppercase tracking-wide"
              >
                {VENUE.ctaLabel} <Icon name="external" className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div>
          <SectionTitle icon="car">{DIRECTIONS.title}</SectionTitle>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {DIRECTIONS.items.map((item) => (
              <li key={item.title} className="panel flex flex-col p-5">
                <Icon name={item.icon} className="h-9 w-9 text-sky" />
                <h3 className="mt-4 text-sm font-black uppercase tracking-wide">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/65">{item.copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
