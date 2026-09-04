import Link from "next/link";
import type { Metadata } from "next";
import FesterLogo from "@/components/FesterLogo";
import Icon from "@/components/landing/Icon";
import { EVENT } from "@/lib/event";
import { PRIVACY_NOTICE, type PrivacyBlock } from "@/lib/privacy-notice";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: `Declaración de protección de datos de Henkel Capital, S.A. de C.V. (Fester) aplicable al registro de ${EVENT.name} ${EVENT.year}.`,
};

const LINK = /(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

/** Convierte en enlaces las URL y correos que el documento trae como texto plano. */
function linkify(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const start = match.index ?? 0;
    let raw = match[0];
    let trailing = "";
    while (/[.,;:)]$/.test(raw)) {
      trailing = raw.slice(-1) + trailing;
      raw = raw.slice(0, -1);
    }
    if (start > last) nodes.push(text.slice(last, start));
    const href = raw.includes("@") && !raw.startsWith("http") ? `mailto:${raw}` : raw;
    nodes.push(
      <a
        key={`${start}-${raw}`}
        href={href}
        target={href.startsWith("mailto:") ? undefined : "_blank"}
        rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
        className="break-all text-sky underline underline-offset-2 hover:text-white"
      >
        {raw}
      </a>,
    );
    if (trailing) nodes.push(trailing);
    last = start + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Block({ block }: { block: PrivacyBlock }) {
  switch (block.kind) {
    case "h2":
      return (
        <h2 className="font-display mt-12 border-t border-white/15 pt-8 text-2xl font-bold uppercase leading-none tracking-wide sm:text-3xl">
          {block.text}
        </h2>
      );
    case "h3":
      return <h3 className="mt-8 text-lg font-bold leading-snug text-white">{block.text}</h3>;
    case "h4":
      return <h4 className="mt-6 text-base font-semibold text-sky">{block.text}</h4>;
    case "label":
      return <p className="mt-5 text-sm font-bold uppercase tracking-wide text-white">{block.text}</p>;
    case "intro":
      return (
        <p className="mt-6 rounded-lg border border-white/15 bg-navy/50 p-5 text-sm font-medium leading-relaxed text-white">
          {linkify(block.text)}
        </p>
      );
    case "strong":
      return <p className="mt-3 text-sm font-semibold leading-relaxed text-white">{linkify(block.text)}</p>;
    case "list":
      return (
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-white/80 marker:text-brand">
          {block.items.map((item) => (
            <li key={item}>{linkify(item)}</li>
          ))}
        </ul>
      );
    default:
      return <p className="mt-3 text-sm leading-relaxed text-white/80">{linkify(block.text)}</p>;
  }
}

export default function PrivacyPage() {
  return (
    <>
      <header className="border-b border-white/10 bg-ink/80">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-3" aria-label="Volver al inicio">
            <FesterLogo className="h-11" />
          </Link>
          <Link href="/#registro" className="btn btn-primary px-4 py-2 text-xs uppercase">
            Regístrate
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">
          <Icon name="arrow" className="h-4 w-4 rotate-180" />
          Volver a {EVENT.name} {EVENT.year}
        </Link>

        <p className="mt-8 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-brand">
          <span aria-hidden className="h-px w-6 bg-brand" />
          Aviso de privacidad
        </p>
        <h1 className="font-display mt-3 text-4xl font-bold leading-none tracking-wide sm:text-5xl">
          {PRIVACY_NOTICE.title}
        </h1>
        <p className="mt-4 text-base text-white/75">
          Aplica al registro y a la participación en {EVENT.name} {EVENT.year}. Fester® es una marca
          de Henkel Capital, S.A. de C.V.
        </p>

        <article className="mt-4">
          {PRIVACY_NOTICE.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </article>
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/50">
        © {EVENT.year} Fester · Henkel Capital, S.A. de C.V. Todos los derechos reservados.
      </footer>
    </>
  );
}
