import RegisterForm from "@/components/RegisterForm";
import SectionTitle from "@/components/landing/SectionTitle";
import { REGISTRATION } from "@/lib/event";

export default function Registration() {
  return (
    <section id="registro" className="border-y border-white/10 bg-navy/45 blueprint">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle>{REGISTRATION.title}</SectionTitle>
          <p className="text-sm text-white/75 sm:max-w-sm sm:text-right">{REGISTRATION.lead}</p>
        </div>
        <div className="mt-8">
          <RegisterForm />
        </div>
      </div>
    </section>
  );
}
