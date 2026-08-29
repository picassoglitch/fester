import { EVENT, VENUE, VENUE_DIRECTIONS_URL } from "@/lib/event";

/**
 * Mapa ilustrado del recinto. Se dibuja en SVG a proposito: no depende de un
 * servicio externo ni de una llave de API, asi que nunca se ve un recuadro en
 * blanco. El boton "Como llegar" abre la ubicacion real en Google Maps.
 */
function MapIllustration() {
  return (
    <svg
      viewBox="0 0 480 260"
      role="img"
      aria-label={`Ubicación aproximada de ${VENUE.name}`}
      className="h-72 w-full sm:h-80"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="480" height="260" fill="#f1f3f5" />

      {/* Manzanas */}
      <g fill="#e6e9ed">
        <rect x="20" y="24" width="120" height="72" />
        <rect x="288" y="24" width="150" height="72" />
        <rect x="20" y="164" width="120" height="80" />
        <rect x="288" y="164" width="150" height="80" />
      </g>

      {/* Area verde */}
      <rect x="330" y="30" width="96" height="60" rx="6" fill="#d7e8d2" />

      {/* Calles */}
      <g stroke="#ffffff" strokeLinecap="round">
        <line x1="0" y1="130" x2="480" y2="122" strokeWidth="16" />
        <line x1="252" y1="-10" x2="222" y2="270" strokeWidth="14" />
        <line x1="150" y1="-10" x2="132" y2="270" strokeWidth="8" />
        <line x1="0" y1="46" x2="480" y2="40" strokeWidth="7" />
        <line x1="0" y1="214" x2="480" y2="208" strokeWidth="7" />
      </g>
      <g stroke="#c9ced6" strokeWidth="1">
        <line x1="0" y1="122" x2="480" y2="114" />
        <line x1="0" y1="138" x2="480" y2="130" />
      </g>

      {/* Manzana del recinto */}
      <rect x="196" y="98" width="62" height="42" fill="#e2001a" fillOpacity="0.12" />

      {/* Pin */}
      <g transform="translate(227 104)">
        <ellipse cx="0" cy="34" rx="10" ry="3.5" fill="#0a2447" fillOpacity="0.25" />
        <path d="M0 32C0 32 14 16.5 14 9A14 14 0 1 0-14 9C-14 16.5 0 32 0 32Z" fill="#e2001a" />
        <circle cx="0" cy="9" r="5" fill="#ffffff" />
      </g>
    </svg>
  );
}

export default function Venue() {
  return (
    <section id="sede" className="border-y border-sky/10 bg-ink-soft/35 blueprint">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <p className="eyebrow">Sede</p>
          <h2 className="mt-4 text-3xl font-black uppercase leading-[0.95] sm:text-4xl">
            {VENUE.name}
          </h2>

          <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-white/75">
            <span aria-hidden className="text-brand">
              📍
            </span>
            <span>
              {VENUE.street}
              <br />
              {VENUE.area}
            </span>
          </p>

          <ul className="mt-6 space-y-3">
            {VENUE.features.map((feature) => (
              <li
                key={feature.copy}
                className="flex items-start gap-3 text-sm leading-relaxed text-white/65"
              >
                <span aria-hidden className="text-lg">
                  {feature.emoji}
                </span>
                {feature.copy}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm text-white/50">
            {EVENT.dateLabel} · {EVENT.scheduleLabel}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/15 bg-white">
          <a
            href={VENUE_DIRECTIONS_URL}
            target="_blank"
            rel="noreferrer"
            className="block transition hover:brightness-110"
          >
            <MapIllustration />
          </a>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 bg-white p-4">
            <p className="text-sm text-ink-soft/80">
              {VENUE.name} · {VENUE.area}
            </p>
            <a
              href={VENUE_DIRECTIONS_URL}
              target="_blank"
              rel="noreferrer"
              className="btn border border-brand px-6 py-2.5 text-sm uppercase tracking-wide text-brand"
            >
              Cómo llegar <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
