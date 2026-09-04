import Link from "next/link";
import FesterLogo from "@/components/FesterLogo";
import Icon from "@/components/landing/Icon";
import { CONTACT, EVENT, PRIVACY } from "@/lib/event";

export default function SiteFooter() {
  return (
    <footer id="contacto" className="border-t border-white/15 bg-navy/70">
      <div className="mx-auto flex w-full max-w-6xl items-start gap-5 px-4 py-12">
        <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white/40 text-white sm:flex">
          <Icon name="lock" className="h-6 w-6" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold uppercase tracking-[0.2em] text-white">
            {PRIVACY.title}
          </h2>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-white/75">
            {PRIVACY.text}{" "}
            <a
              href={PRIVACY.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-white"
            >
              {PRIVACY.linkLabel}
            </a>
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <FesterLogo className="h-9" />
            <div className="text-sm text-white/75">
              <p className="font-bold uppercase tracking-wide text-white">
                {EVENT.name} {EVENT.year}
              </p>
              <p>
                {EVENT.dateLabel} · {EVENT.city}
              </p>
            </div>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
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
        </div>

        <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">
          © {EVENT.year} Fester · Henkel Capital, S.A. de C.V. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
