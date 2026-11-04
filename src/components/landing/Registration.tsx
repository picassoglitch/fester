import Link from "next/link";
import RegisterForm from "@/components/RegisterForm";
import SectionTitle from "@/components/landing/SectionTitle";
import { REGISTRATION, REGISTRATION_CLOSED, REGISTRATION_OPEN } from "@/lib/event";

export default function Registration() {
  return (
    <section id="registro" className="border-y border-white/10 bg-navy/45 blueprint">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle>{REGISTRATION.title}</SectionTitle>
          <p className="text-sm text-white/75 sm:max-w-sm sm:text-right">
            {REGISTRATION_OPEN ? REGISTRATION.lead : REGISTRATION_CLOSED.chip}
          </p>
        </div>
        <div className="mt-8">
          {REGISTRATION_OPEN ? (
            <RegisterForm />
          ) : (
            <div className="rounded-2xl border-2 border-gold/60 bg-ink/60 p-6 text-center sm:p-10">
              <p className="text-xl font-bold text-gold sm:text-2xl">{REGISTRATION_CLOSED.banner}</p>
              <p className="mx-auto mt-3 max-w-xl text-white/80">{REGISTRATION_CLOSED.detail}</p>
              <Link href="/mi-cuenta" className="btn btn-primary mt-6 inline-flex px-7 py-3.5 uppercase">
                {REGISTRATION_CLOSED.cta}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
