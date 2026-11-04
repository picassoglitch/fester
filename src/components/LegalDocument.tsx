import Link from "next/link";
import FesterLogo from "@/components/FesterLogo";
import Icon, { type IconName } from "@/components/landing/Icon";
import { EVENT } from "@/lib/event";
import type { PrivacyBlock } from "@/lib/privacy-notice";

export type LegalBlock = PrivacyBlock;

/** Detecta direcciones web y correos dentro del texto legal para volverlos enlaces. */
const LINK_PATTERN = /((?:https?:\/\/|www\.)[^\s()"]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g;
/** Puntuacion que cierra la oracion y no forma parte del enlace. */
const TRAILING_PUNCTUATION = /[.,;:?!)#]+$/;

function linkify(text: string): React.ReactNode[] {
  return text.split(LINK_PATTERN).map((part, index) => {
    if (index % 2 === 0) return part;

    const trailing = part.match(TRAILING_PUNCTUATION)?.[0] ?? "";
    const target = part.slice(0, part.length - trailing.length);
    const isEmail = target.includes("@") && !target.startsWith("http") && !target.startsWith("www.");
    const href = isEmail
      ? `mailto:${target}`
      : target.startsWith("www.")
        ? `https://${target}`
        : target;

    return (
      <span key={index}>
        <a
          href={href}
          target={isEmail ? undefined : "_blank"}
          rel={isEmail ? undefined : "noopener noreferrer"}
          className="break-words underline underline-offset-2 hover:text-white"
        >
          {target}
        </a>
        {trailing}
      </span>
    );
  });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function Block({ block, sectionNumber }: { block: LegalBlock; sectionNumber?: number }) {
  switch (block.kind) {
    case "h2":
      return (
        <h2
          id={slugify(block.text)}
          className="font-display mt-12 flex scroll-mt-24 items-baseline gap-3 text-2xl font-bold uppercase leading-tight tracking-wide text-white sm:text-3xl"
        >
          <span className="text-brand">{sectionNumber}.</span>
          <span>{block.text}</span>
        </h2>
      );
    case "h3":
      return (
        <h3 className="font-display mt-8 text-xl font-semibold leading-tight text-white sm:text-2xl">
          {block.text}
        </h3>
      );
    case "h4":
      return (
        <h4 className="mt-6 text-base font-bold text-white">{block.text}</h4>
      );
    case "label":
      return <p className="mt-4 text-sm font-bold uppercase tracking-wide text-sky">{block.text}</p>;
    case "list":
      return (
        <ul className="mt-3 list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-white/80">
          {block.items.map((item) => (
            <li key={item}>{linkify(item)}</li>
          ))}
        </ul>
      );
    case "p":
      return <p className="mt-3 text-sm leading-relaxed text-white/80">{linkify(block.text)}</p>;
  }
}

type LegalDocumentProps = {
  /** Linea pequena sobre el titulo: quien emite el documento. */
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon: IconName;
  /** Contenido entre el encabezado y el indice. */
  intro: React.ReactNode;
  navLabel: string;
  blocks: readonly LegalBlock[];
  /** Recuadro de contacto al final del documento. */
  contact: React.ReactNode;
  owner: string;
};

/** Pagina de un documento legal (aviso de privacidad, terminos) con indice numerado. */
export default function LegalDocument({
  eyebrow,
  title,
  subtitle,
  icon,
  intro,
  navLabel,
  blocks,
  contact,
  owner,
}: LegalDocumentProps) {
  const sections = blocks
    .filter((block): block is { kind: "h2"; text: string } => block.kind === "h2")
    .map((block, index) => ({ number: index + 1, text: block.text, id: slugify(block.text) }));
  let sectionNumber = 0;

  // Un solo contenedor: con varios nodos raiz, Next hace scroll al pie al navegar.
  return (
    <div>
      <header className="sticky top-0 z-50 border-b border-sky/15 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <FesterLogo className="h-12" />
            <span className="hidden text-xs font-semibold uppercase tracking-wider text-white/80 sm:block">
              {EVENT.name} {EVENT.year}
            </span>
          </Link>
          <Link href="/#registro" className="btn btn-ghost px-4 py-2 text-xs uppercase">
            Volver al registro
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
        <div className="flex items-start gap-4">
          <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white/40 text-white sm:flex">
            <Icon name={icon} className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky">{eyebrow}</p>
            <h1 className="font-display mt-2 text-3xl font-bold uppercase leading-none tracking-wide sm:text-4xl">
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-sm text-white/60">{subtitle}</p>}
          </div>
        </div>

        {intro}

        <nav aria-label={navLabel} className="panel mt-8 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Contenido</p>
          <ol className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-white/85 hover:text-white">
                  <span className="text-brand">{section.number}.</span> {section.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article>
          {blocks.map((block, index) => {
            if (block.kind === "h2") sectionNumber += 1;
            return <Block key={index} block={block} sectionNumber={sectionNumber} />;
          })}
        </article>

        <div className="panel mt-12 px-5 py-5 text-sm leading-relaxed text-white/80">{contact}</div>
      </main>

      <footer className="border-t border-white/10 py-5 text-center text-xs text-white/50">
        © {EVENT.year} Fester · {owner} Todos los derechos reservados.
      </footer>
    </div>
  );
}
