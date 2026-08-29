"use client";

import { useEffect, useState } from "react";
import FesterLogo from "@/components/FesterLogo";
import { EVENT, NAV_LINKS } from "@/lib/event";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors ${
        scrolled
          ? "border-sky/15 bg-ink/90 backdrop-blur"
          : "border-transparent bg-ink/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
        <a href="#evento" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <FesterLogo className="h-8" />
          <span className="hidden whitespace-nowrap text-[0.65rem] leading-tight text-white/70 sm:block">
            El Socio
            <br />
            que Nunca Falla<span className="align-super text-[0.5rem]">®</span>
          </span>
        </a>

        <nav className="ml-auto hidden items-center gap-1 xl:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded px-2.5 py-2 text-[0.7rem] font-semibold uppercase tracking-wider text-white/75 transition hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <a href="#registro" className="btn btn-primary ml-2 px-5 py-2.5 text-xs uppercase">
            Regístrate
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:hidden">
          <a href="#registro" className="btn btn-primary px-4 py-2 text-xs uppercase">
            Regístrate
          </a>
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            className="btn btn-ghost px-3 py-2"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-sky/15 bg-ink/95 px-4 py-3 xl:hidden">
          <ul className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-2.5 text-sm font-semibold uppercase tracking-wide text-white/80"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-white/10 pt-3 text-xs text-white/45">
            {EVENT.dateLabel} · {EVENT.city}
          </p>
        </nav>
      )}
    </header>
  );
}
