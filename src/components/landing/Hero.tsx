import Image from "next/image";
import { EVENT } from "@/lib/event";

/** Key visual del evento (public/hero-encuentro-fester-2026.png). */
const HERO_IMAGE = "/hero-encuentro-fester-2026.png";

export default function Hero() {
  return (
    <section
      id="evento"
      className="relative isolate flex min-h-[30rem] items-center overflow-hidden lg:h-[42rem]"
    >
      {/* Fondo azul Fester: sostiene el lado del titulo y empata con la imagen. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-30 bg-[radial-gradient(70rem_45rem_at_20%_10%,#123a75_0%,#0a2a58_45%,#04162e_100%)]"
      />

      {/*
       * Key visual. El bloque se topa al ancho nativo del archivo (840px) para
       * que la imagen nunca se amplie: escalarla la deja borrosa. La relacion
       * de aspecto del bloque queda casi igual a la del archivo, asi que el
       * recorte es minimo. El fundido va dentro del bloque para que siempre
       * caiga sobre el borde de la imagen, sin importar el ancho de pantalla.
       */}
      <div className="absolute inset-y-0 right-0 -z-20 w-full lg:w-[62%] lg:max-w-[52.5rem]">
        <Image
          src={HERO_IMAGE}
          alt="Asistentes recorriendo el Encuentro Fester entre conferencias, demostraciones y stands"
          fill
          sizes="(max-width: 1024px) 100vw, 840px"
          loading="eager"
          fetchPriority="high"
          className="object-cover object-center"
        />
        {/* Rampa a la izquierda del bloque: evita el corte duro contra el fondo. */}
        <div
          aria-hidden
          className="absolute inset-y-0 -left-56 hidden w-56 bg-[linear-gradient(90deg,transparent,#04162e)] lg:block"
        />
        <div
          aria-hidden
          className="absolute inset-0 hidden bg-[linear-gradient(90deg,#04162e_0%,#04162e_8%,rgba(4,22,46,0.82)_18%,rgba(4,22,46,0.28)_34%,transparent_48%)] lg:block"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,22,46,0.9)_0%,rgba(4,22,46,0.86)_55%,rgba(4,22,46,0.94)_100%)] lg:hidden"
        />
      </div>

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
