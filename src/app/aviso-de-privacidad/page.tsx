import type { Metadata } from "next";
import LegalDocument from "@/components/LegalDocument";
import { EVENT, PRIVACY_PATH } from "@/lib/event";
import { PRIVACY_NOTICE } from "@/lib/privacy-notice";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  alternates: { canonical: PRIVACY_PATH },
  description: `Aviso de privacidad de ${PRIVACY_NOTICE.controller}: qué datos recabamos al registrarte a ${EVENT.name} ${EVENT.year}, con qué finalidad y cómo ejercer tus derechos ARCO.`,
};

/** Aviso de privacidad completo; el texto vive en src/lib/privacy-notice.ts. */
export default function PrivacyNoticePage() {
  return (
    <LegalDocument
      eyebrow={PRIVACY_NOTICE.controller}
      title="Aviso de privacidad"
      subtitle={PRIVACY_NOTICE.title}
      icon="lock"
      intro={<p className="mt-8 text-base leading-relaxed text-white/85">{PRIVACY_NOTICE.intro}</p>}
      navLabel="Contenido del aviso"
      blocks={PRIVACY_NOTICE.blocks}
      owner={PRIVACY_NOTICE.controller}
      contact={
        <>
          <p className="font-bold text-white">¿Dudas sobre tus datos?</p>
          <p className="mt-1">
            Escribe a{" "}
            <a
              href={`mailto:${PRIVACY_NOTICE.contactEmail}`}
              className="underline underline-offset-2 hover:text-white"
            >
              {PRIVACY_NOTICE.contactEmail}
            </a>{" "}
            o por correo postal a {PRIVACY_NOTICE.controller}, {PRIVACY_NOTICE.address}.
          </p>
        </>
      }
    />
  );
}
