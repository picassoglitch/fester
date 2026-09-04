import Image from "next/image";
import Icon from "@/components/landing/Icon";
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

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-center">
        <a
          href="#registro"
          className="btn btn-primary w-full max-w-sm justify-between px-7 py-4 text-lg uppercase tracking-wide sm:w-auto sm:min-w-[18rem]"
        >
          Regístrate <span aria-hidden>→</span>
        </a>
        <p className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gold px-5 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-gold sm:text-sm">
          <Icon name="user" className="h-4 w-4" />
          {EVENT.registrationDeadline} · Entrada sin costo
        </p>
      </div>
    </section>
  );
}
