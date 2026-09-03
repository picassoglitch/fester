import Icon from "@/components/landing/Icon";
import SectionTitle from "@/components/landing/SectionTitle";
import { FAQ } from "@/lib/event";

/**
 * Acordeon con <details>: funciona sin JavaScript y el "+" gira a "×" al abrir.
 */
export default function Faq() {
  return (
    <section id="faq" className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
      <SectionTitle icon="help">{FAQ.title}</SectionTitle>

      <div className="mt-8 grid gap-3 lg:grid-cols-2 lg:gap-x-6">
        {FAQ.items.map((item) => (
          <details key={item.question} className="group panel self-start">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-bold leading-snug sm:text-base">{item.question}</span>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-sky/30 text-sky transition-transform duration-200 group-open:rotate-45">
                <Icon name="plus" className="h-4 w-4" />
              </span>
            </summary>
            <p className="px-5 pb-5 text-sm leading-relaxed text-white/65">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
