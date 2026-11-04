import type { Metadata } from "next";
import LegalDocument from "@/components/LegalDocument";
import { EVENT } from "@/lib/event";
import { TERMS, TERMS_PATH } from "@/lib/terms";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  alternates: { canonical: TERMS_PATH },
  description: `Términos y condiciones de ${EVENT.name} ${EVENT.year}: registro, aforo, acceso, actividades, alimentos, regalos, sorteos y uso de imagen.`,
};

/** Terminos y condiciones completos; el texto vive en src/lib/terms.ts. */
export default function TermsPage() {
  return (
    <LegalDocument
      eyebrow={`${EVENT.name} ${EVENT.year}`}
      title="Términos y condiciones"
      icon="shield"
      intro={
        <>
          <p className="mt-8 text-base font-bold leading-relaxed text-white">{TERMS.lead}</p>
          <p className="mt-4 text-base leading-relaxed text-white/85">{TERMS.intro}</p>
        </>
      }
      navLabel="Contenido de los términos"
      blocks={TERMS.blocks}
      owner="Henkel Capital, S.A. de C.V."
      contact={
        <>
          <p className="font-bold text-white">¿Dudas sobre el evento?</p>
          <p className="mt-1">
            Escribe a{" "}
            <a
              href={`mailto:${TERMS.contactEmail}`}
              className="underline underline-offset-2 hover:text-white"
            >
              {TERMS.contactEmail}
            </a>
            .
          </p>
        </>
      }
    />
  );
}
