import Image from "next/image";
import { EVENT } from "@/lib/event";

/** Key visual del evento (public/hero-encuentro-fester-2026.png). */
const HERO_IMAGE = "/hero-encuentro-fester-2026.png";

export default function Hero() {
  return (
    <section
      id="evento"
      className="relative isolate flex min-h-[30rem] items-center overflow-hidden lg:min-h-[44rem]"
    >
      {/* Fondo azul Fester: sostiene el lado del titulo y empata con la imagen. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-30 bg-[radial-gradient(70rem_45rem_at_20%_10%,#123a75_0%,#0a2a58_45%,#04162e_100%)]"
      />

      {/* Key visual: pegado a la derecha en escritorio, de fondo completo en movil. */}
      <div className="absolute inset-y-0 right-0 -z-20 w-full lg:w-[62%]">
        <Image
          src={HERO_IMAGE}
          alt="Asistentes recorriendo el Encuentro Fester entre conferencias, demostraciones y stands"
          fill
          sizes="(max-width: 1024px) 100vw, 62vw"
          loading="eager"
          fetchPriority="high"
          className="object-cover object-center"
        />
      </div>

      {/* Fundido de la imagen hacia el azul, para que el titulo se lea. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 hidden bg-[linear-gradient(90deg,#04162e_0%,#04162e_41%,rgba(4,22,46,0.8)_48%,rgba(4,22,46,0.3)_57%,transparent_68%)] lg:block"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(4,22,46,0.9)_0%,rgba(4,22,46,0.86)_55%,rgba(4,22,46,0.94)_100%)] lg:hidden"
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
        <div className="bracket max-w-lg">
          <h1 className="text-[3rem] font-black uppercase leading-[0.86] tracking-tight sm:text-6xl lg:text-[4.5rem]">
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
