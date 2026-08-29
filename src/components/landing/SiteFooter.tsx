import Link from "next/link";
import FesterLogo from "@/components/FesterLogo";
import { CONTACT, EVENT, NAV_LINKS, VENUE } from "@/lib/event";

export default function SiteFooter() {
  return (
    <footer id="contacto" className="border-t border-sky/15 bg-ink/80">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <FesterLogo className="h-9" />
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/50">{EVENT.claim}</p>
          <p className="mt-4 text-sm text-white/60">
            {EVENT.name} {EVENT.year}
            <br />
            {EVENT.dateLabel}
            <br />
            {VENUE.name} · {EVENT.city}
          </p>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Contacto</h3>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li>
              <a href={`mailto:${CONTACT.email}`} className="hover:text-white">
                {CONTACT.email}
              </a>
            </li>
            <li>
              <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className="hover:text-white">
                {CONTACT.phone}
              </a>
            </li>
            <li className="text-white/45">{CONTACT.scheduleLabel}</li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Secciones</h3>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="hover:text-white">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Tu pase</h3>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li>
              <Link href="/pase" className="hover:text-white">
                Ya tengo un pase
              </Link>
            </li>
            <li>
              <Link href="/staff" className="hover:text-white">
                Acceso staff
              </Link>
            </li>
          </ul>
          <a href="#registro" className="btn btn-primary mt-5 w-full uppercase tracking-wide">
            Regístrate
          </a>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs text-white/40">
        © {EVENT.year} Fester · Henkel Capital, S.A. de C.V. Todos los derechos reservados.
      </div>
    </footer>
  );
}
