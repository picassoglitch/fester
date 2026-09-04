import Image from "next/image";
import Icon from "@/components/landing/Icon";
import SectionTitle from "@/components/landing/SectionTitle";
import { SPEAKERS, SPEAKERS_SECTION, type Speaker } from "@/lib/event";

function initials(name: string): string {
  // Se ignoran los titulos (Ing., Arq., M.I.) para quedarnos con nombre y apellido.
  const parts = name.split(/\s+/).filter((part) => !part.endsWith(".") && part.length > 1);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Retrato del speaker. Mientras marketing entrega las fotos (public/speakers/*)
 * se muestra un marcador con las iniciales sobre el mismo fondo.
 */
function Portrait({ speaker }: { speaker: Speaker }) {
  if (speaker.photo) {
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-navy">
        <Image
          src={speaker.photo}
          alt={speaker.name}
          fill
          sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
          className="object-cover object-top"
        />
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-gradient-to-b from-ink to-navy"
    >
      <Icon name="user" className="absolute -bottom-6 h-40 w-40 text-white/10" />
      <span className="text-4xl font-black text-white/80">{initials(speaker.name)}</span>
    </div>
  );
}

export default function Speakers() {
  return (
    <section id="conferencistas" className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-20">
      <SectionTitle>{SPEAKERS_SECTION.title}</SectionTitle>

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SPEAKERS.map((speaker) => (
          <li key={speaker.name} className="panel flex flex-col overflow-hidden">
            <Portrait speaker={speaker} />
            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <h3 className="font-display text-2xl font-bold uppercase leading-none tracking-wide">
                {speaker.name}
              </h3>
              <p className="mt-1.5 text-xs font-semibold leading-snug text-sky">{speaker.role}</p>
              {speaker.linkedin && (
                <a
                  href={speaker.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`LinkedIn de ${speaker.name}`}
                  className="mt-3 inline-flex h-7 w-7 items-center justify-center rounded bg-white text-navy"
                >
                  <Icon name="linkedin" className="h-4 w-4" />
                </a>
              )}
              <p className="mt-4 text-sm leading-relaxed text-white/75">{speaker.bio}</p>
              <p className="mt-5 border-l-2 border-brand pl-3 text-sm font-semibold leading-snug text-white">
                {speaker.talk}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
