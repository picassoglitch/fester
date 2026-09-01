import Image from "next/image";
import { EVENT } from "@/lib/event";

/**
 * Hero: el arte oficial de la landing. Las piezas ya traen el titulo, el claim,
 * la fecha y la sede, asi que no se les encima texto: solo se agrega el boton de
 * registro debajo. Cada pieza se muestra completa (sin recorte) en su formato.
 */
export default function Hero() {
  return (
    <section id="evento" className="relative bg-ink">
      <h1 className="sr-only">
        {EVENT.name} {EVENT.year} — {EVENT.tagline}. {EVENT.dateLabel}, {EVENT.city}.
      </h1>

      <Image
        src="/arte-lp-desktop.jpg"
        alt={`${EVENT.name} ${EVENT.year}. ${EVENT.tagline}. ${EVENT.dateLabel}, ${EVENT.city}.`}
        width={2560}
        height={1000}
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        className="hidden h-auto w-full lg:block"
      />

      <Image
        src="/arte-lp-mobile.jpg"
        alt={`${EVENT.name} ${EVENT.year}. ${EVENT.tagline}. ${EVENT.dateLabel}, ${EVENT.city}.`}
        width={1080}
        height={1350}
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        className="h-auto w-full lg:hidden"
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 py-8">
        <a
          href="#registro"
          className="btn btn-primary w-full max-w-sm justify-between px-7 py-4 text-lg uppercase tracking-wide sm:w-auto sm:min-w-[18rem]"
        >
          Regístrate <span aria-hidden>→</span>
        </a>
        <p className="text-sm text-white/60">{EVENT.registrationDeadline} · Entrada sin costo</p>
      </div>
    </section>
  );
}
