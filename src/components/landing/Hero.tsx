import { EVENT } from "@/lib/event";

/**
 * Key visual del evento. El archivo va en /public con este nombre exacto.
 * Si todavia no esta, el hero cae al degradado azul y no se rompe nada.
 */
const HERO_IMAGE = "/hero-encuentro-fester-2026.jpg";

export default function Hero() {
  return (
    <section
      id="evento"
      className="relative isolate flex min-h-[28rem] items-center overflow-hidden lg:min-h-[34rem]"
    >
      {/* Respaldo por si la imagen aun no esta subida. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-30 bg-[radial-gradient(80rem_50rem_at_70%_10%,#1b57a5_0%,#0b2f66_45%,#04162e_100%)]"
      />

      {/* Key visual a todo lo ancho: la foto cae del lado derecho. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-cover bg-right bg-no-repeat"
        style={{ backgroundImage: `url(${HERO_IMAGE})` }}
      />

      {/*
       * Degradado azul sobre la imagen para que el titulo se lea:
       * horizontal en escritorio (deja libre la foto de la derecha) y
       * parejo en movil, donde el texto cae encima de la imagen.
       */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 hidden bg-[linear-gradient(95deg,#04162e_0%,#04162e_34%,rgba(5,27,56,0.82)_48%,rgba(6,32,66,0.25)_66%,transparent_82%)] lg:block"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(4,22,46,0.9)_0%,rgba(4,22,46,0.86)_55%,rgba(4,22,46,0.94)_100%)] lg:hidden"
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
        <div className="bracket max-w-xl">
          <h1 className="text-[3rem] font-black uppercase leading-[0.86] tracking-tight sm:text-6xl lg:text-[4.75rem]">
            <span className="block">Encuentro</span>
            <span className="block">Fester {EVENT.year}</span>
          </h1>

          <p className="mt-6 text-lg font-normal leading-snug text-white/85 sm:text-xl">
            {EVENT.tagline}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/85">
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
      </div>
    </section>
  );
}
