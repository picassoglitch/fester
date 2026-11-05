import Link from "next/link";
import { REGISTRATION_CLOSED, REGISTRATION_OPEN } from "@/lib/event";

/** Franja fija arriba de la landing mientras el registro esta cerrado. */
export default function RegistrationClosedBanner() {
  if (REGISTRATION_OPEN) return null;
  return (
    <div role="status" className="bg-gold text-ink">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-1 px-4 py-2.5 text-center text-sm font-semibold sm:flex-row sm:gap-3">
        <span>{REGISTRATION_CLOSED.banner}</span>
        <Link
          href="/mi-cuenta"
          className="rounded underline underline-offset-4 transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {REGISTRATION_CLOSED.cta} →
        </Link>
      </div>
    </div>
  );
}
