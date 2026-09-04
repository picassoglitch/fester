import Icon from "@/components/landing/Icon";
import SectionTitle from "@/components/landing/SectionTitle";
import { DIRECTIONS, VENUE } from "@/lib/event";

export default function Venue() {
  return (
    <section id="sede" className="border-y border-white/10 bg-ink-soft/40 blueprint">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[2fr_3fr]">
        <div>
          <SectionTitle>{VENUE.title}</SectionTitle>
          <div className="panel mt-6 flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:p-7">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-brand text-white">
              <Icon name="pin" className="h-8 w-8" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-3xl font-bold uppercase leading-none tracking-wide">
                {VENUE.name},
                <br />
                {VENUE.city}
              </p>
              <a
                href={VENUE.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-light mt-5 px-6 py-3 text-sm uppercase tracking-wide"
              >
                {VENUE.ctaLabel} <Icon name="arrow" className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div>
          <SectionTitle as="h3">{DIRECTIONS.title}</SectionTitle>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {DIRECTIONS.items.map((item) => (
              <li key={item.title} className="panel flex flex-col items-center p-5 text-center">
                <Icon name={item.icon} className="h-9 w-9 text-white" />
                <h4 className="font-display mt-4 text-xl font-bold uppercase leading-none tracking-wide">{item.title}</h4>
                <p className="mt-2 text-xs leading-relaxed text-white/75">{item.copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
