"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SPEAKERS } from "@/lib/event";

function initials(name: string): string {
  // Se ignoran los titulos (Ing., Arq., M.I.) para quedarnos con nombre y apellido.
  const parts = name
    .split(/\s+/)
    .filter((part) => !part.endsWith(".") && part.length > 1);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
      <path d="M4.98 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 4.98 0ZM.24 8.25h4.5V24H.24V8.25Zm7.75 0h4.31v2.15h.06c.6-1.14 2.07-2.34 4.26-2.34 4.56 0 5.4 3 5.4 6.9V24h-4.5v-7.9c0-1.88-.03-4.3-2.62-4.3-2.62 0-3.02 2.05-3.02 4.16V24H7.99V8.25Z" />
    </svg>
  );
}

export default function Speakers() {
  const trackRef = useRef<HTMLUListElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  /**
   * En pantallas anchas caben las cinco tarjetas y no hay nada que recorrer:
   * ahi las flechas y los puntos sobran, porque no harian nada al pulsarlos.
   */
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector("li");
    const step = card ? card.clientWidth + 16 : track.clientWidth;
    const overflow = track.scrollWidth - track.clientWidth;
    setPages(overflow > 1 && step > 0 ? Math.ceil(overflow / step) + 1 : 1);
    setPage(step > 0 ? Math.round(track.scrollLeft / step) : 0);
  }, []);

  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  const scrollByCards = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector("li");
    const step = card ? card.clientWidth + 16 : track.clientWidth;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  }, []);

  const hasCarousel = pages > 1;

  return (
    <section id="conferencistas" className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
      <div className="grid gap-8 lg:grid-cols-[0.65fr_2fr] lg:items-center">
        <div>
          <p className="eyebrow">Conferencistas</p>
          <h2 className="mt-4 text-3xl font-black uppercase leading-[0.95] sm:text-4xl">
            Conoce a
            <br />
            nuestros expertos
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Especialistas de Fester y de la industria que van a compartir criterio técnico y casos
            reales de obra.
          </p>
        </div>

        <div className="relative min-w-0">
          <ul
            id="lista-conferencistas"
            ref={trackRef}
            onScroll={measure}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {SPEAKERS.map((speaker) => (
              <li
                key={speaker.name}
                className="flex w-[calc(100%-1rem)] shrink-0 snap-start flex-col overflow-hidden rounded-xl bg-white text-ink-soft sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)] xl:w-[calc(20%-0.8rem)]"
              >
                <div
                  aria-hidden
                  className="flex h-40 items-center justify-center bg-gradient-to-b from-[#c9d2dd] to-[#8d99a8] text-3xl font-black text-white/90"
                >
                  {initials(speaker.name)}
                </div>
                <div className="flex flex-1 flex-col items-start gap-1.5 p-4">
                  <h3 className="text-sm font-black uppercase leading-tight">{speaker.name}</h3>
                  <p className="text-xs leading-snug text-ink-soft/70">{speaker.role}</p>
                  {speaker.org && (
                    <p className="text-xs font-semibold text-brand">{speaker.org}</p>
                  )}
                  <span className="mt-auto inline-flex h-7 w-7 items-center justify-center rounded bg-navy text-white">
                    <LinkedInIcon />
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* Flechas y puntos: solo cuando hay tarjetas fuera de vista. */}
          {hasCarousel && (
            <>
              <button
                type="button"
                aria-label="Conferencistas anteriores"
                aria-controls="lista-conferencistas"
                onClick={() => scrollByCards(-1)}
                className="absolute left-1 top-[45%] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-sky/30 bg-ink/90 text-lg text-white/80 transition hover:text-white lg:-left-5"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Conferencistas siguientes"
                aria-controls="lista-conferencistas"
                onClick={() => scrollByCards(1)}
                className="absolute right-1 top-[45%] z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-sky/30 bg-ink/90 text-lg text-white/80 transition hover:text-white lg:-right-5"
              >
                ›
              </button>

              <div className="mt-4 flex items-center justify-center gap-1.5">
                {Array.from({ length: pages }).map((_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 rounded-full transition-all ${
                      index === page ? "w-5 bg-brand" : "w-1.5 bg-white/25"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
