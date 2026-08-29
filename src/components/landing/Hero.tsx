import { EVENT, VENUE } from "@/lib/event";

/**
 * Ruta del key visual oficial. Cuando marketing suba la imagen a /public
 * (por ejemplo "/kv-encuentro-fester-2026.jpg") basta con ponerla aqui:
 * el hero la usa como fondo y conserva el degradado azul por encima.
 */
const HERO_IMAGE: string | null = null;

function Beam({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`animate-beam absolute origin-top bg-gradient-to-b from-transparent via-sky/70 to-transparent blur-[1px] ${className}`}
    />
  );
}

export default function Hero() {
  return (
    <section id="evento" className="relative isolate overflow-hidden">
      {/* Fondo: degradado azul Fester + haces de luz del key visual. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[radial-gradient(80rem_50rem_at_70%_10%,#1b57a5_0%,#0b2f66_45%,#04162e_100%)]"
        style={
          HERO_IMAGE
            ? {
                backgroundImage: `linear-gradient(100deg, rgba(4,22,46,0.96) 0%, rgba(7,35,73,0.75) 45%, rgba(7,35,73,0.35) 100%), url(${HERO_IMAGE})`,
                backgroundSize: "cover",
                backgroundPosition: "center right",
              }
            : undefined
        }
      />
      <div aria-hidden className="absolute inset-0 -z-10 opacity-60">
        <Beam className="left-[52%] top-0 h-[120%] w-[2px] rotate-[18deg]" />
        <Beam className="left-[64%] top-0 h-[120%] w-[3px] rotate-[14deg] [animation-delay:600ms]" />
        <Beam className="left-[78%] top-0 h-[120%] w-[2px] rotate-[10deg] [animation-delay:1200ms]" />
        <Beam className="left-[88%] top-0 h-[120%] w-[6px] rotate-[6deg] [animation-delay:300ms]" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24">
        <div className="bracket">
          <h1 className="text-[3rem] font-black uppercase leading-[0.86] tracking-tight sm:text-6xl lg:text-[4.75rem]">
            <span className="block">Encuentro</span>
            <span className="block">
              Fester <span className="text-white">{EVENT.year}</span>
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg font-normal leading-snug text-white/85 sm:text-xl">
            {EVENT.tagline}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden>🗓️</span>
              {EVENT.dateLabel}
            </span>
            <span aria-hidden className="hidden h-4 w-px bg-white/25 sm:block" />
            <span className="inline-flex items-center gap-2">
              <span aria-hidden>📍</span>
              {EVENT.city}
            </span>
          </div>

          <div className="mt-8">
            <a
              href="#registro"
              className="btn btn-primary w-full max-w-xs justify-between px-7 py-4 text-lg uppercase tracking-wide sm:w-auto sm:min-w-[16rem]"
            >
              Regístrate <span aria-hidden>→</span>
            </a>
          </div>
        </div>

        {/* Panel derecho: bloque grafico del key visual. */}
        <div className="relative hidden min-h-[24rem] overflow-hidden rounded-2xl border border-sky/20 bg-ink-soft/40 blueprint lg:flex lg:flex-col">
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(180deg,transparent,rgba(27,87,165,0.55))]"
          />

          <div className="relative flex items-start justify-end p-6">
            <span className="rounded border border-white/25 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.25em] text-white/70">
              Henkel
            </span>
          </div>

          <div className="relative mt-auto flex flex-col gap-3 px-6 pb-6">
            <p className="text-2xl font-black uppercase leading-tight">
              Del piso al techo,
              <br />
              <span className="text-brand">una sola marca</span>
            </p>
            <p className="max-w-sm text-sm text-white/60">
              Impermeabilización, adhesivos y protección de superficies para cada etapa de tu
              proyecto, con el respaldo técnico de Henkel.
            </p>
            <p className="mt-2 rounded bg-brand px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white">
              {VENUE.name} · {EVENT.dateShort} · {EVENT.city}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
