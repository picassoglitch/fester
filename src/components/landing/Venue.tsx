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
      <rect width="480" height="260" fill="#0a2447" />

      {/* Manzanas */}
      <g stroke="#5ca8ff" strokeOpacity="0.16" strokeWidth="1">
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 30} x2="480" y2={i * 30} />
        ))}
        {Array.from({ length: 17 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 30} y1="0" x2={i * 30} y2="260" />
        ))}
      </g>

      {/* Avenidas principales */}
      <g stroke="#5ca8ff" strokeOpacity="0.4" strokeWidth="7" strokeLinecap="round">
        <line x1="240" y1="-20" x2="200" y2="280" />
        <line x1="-20" y1="150" x2="500" y2="126" />
      </g>
      <g stroke="#5ca8ff" strokeOpacity="0.22" strokeWidth="4" strokeLinecap="round">
        <line x1="60" y1="-20" x2="120" y2="280" />
        <line x1="380" y1="-20" x2="345" y2="280" />
      </g>

      {/* Manzana del recinto */}
      <rect
        x="196"
        y="96"
        width="70"
        height="46"
        fill="#e2001a"
        fillOpacity="0.16"
        stroke="#e2001a"
        strokeOpacity="0.55"
      />

      {/* Pin */}
      <g transform="translate(231 104)">
        <ellipse cx="0" cy="34" rx="10" ry="3.5" fill="#04162e" fillOpacity="0.55" />
        <path
          d="M0 32C0 32 14 16.5 14 9A14 14 0 1 0-14 9C-14 16.5 0 32 0 32Z"
          fill="#e2001a"
        />
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

        <div className="overflow-hidden rounded-2xl border border-sky/20 bg-ink/50">
          <a
            href={VENUE_DIRECTIONS_URL}
            target="_blank"
            rel="noreferrer"
            className="block transition hover:brightness-110"
          >
            <MapIllustration />
          </a>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky/15 p-4">
            <p className="text-sm text-white/70">
              {VENUE.name} · {VENUE.area}
            </p>
            <a
              href={VENUE_DIRECTIONS_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary px-6 py-2.5 text-sm uppercase tracking-wide"
            >
              Cómo llegar <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
