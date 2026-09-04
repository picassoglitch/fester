import type { SVGProps } from "react";

/**
 * Ilustraciones de la infografia "Tu recorrido": trazo blanco con acentos
 * rojos, en un lienzo de 64x64 para conservar el detalle al mostrarse grandes.
 * Los circulos de "palomita" se rellenan con el color de la tarjeta
 * (--journey-card) para tapar las lineas que quedan detras.
 */
export type JourneyArtName = "register" | "confirm" | "access" | "participate" | "shield";

const CARD_FILL = "var(--journey-card)";

const ART: Record<JourneyArtName, React.ReactNode> = {
  register: (
    <>
      <rect x="13" y="10" width="38" height="48" rx="4" />
      <rect x="25" y="6" width="14" height="8" rx="2" fill={CARD_FILL} />
      <circle cx="24" cy="27" r="4.5" />
      <path d="M15.5 40a8.5 8.5 0 0 1 17 0" />
      <path d="M36 25h8" />
      <path d="M36 32h8" />
      <path d="M20 47h18" />
      <g className="text-brand">
        <circle cx="48" cy="48" r="9" fill={CARD_FILL} />
        <path d="m43.5 48.5 3 3 6-6" />
      </g>
    </>
  ),
  confirm: (
    <>
      <path d="M8 31.5 20 22" />
      <path d="m56 31.5-12-9.5" />
      <path d="M20 35V11a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v24" />
      <rect x="25" y="14" width="6" height="6" />
      <rect x="33" y="14" width="6" height="6" />
      <rect x="25" y="22" width="6" height="6" />
      <path d="M33 22h2v2" />
      <path d="M37 22h2v6h-2" />
      <path d="M33 26v2h2" />
      <g className="text-brand">
        <path d="M22.5 12.5v-2h2" />
        <path d="M39.5 10.5h2v2" />
        <path d="M22.5 29.5v2h2" />
        <path d="M41.5 29.5v2h-2" />
      </g>
      <path d="M8 31.5V54a2 2 0 0 0 2 2h44a2 2 0 0 0 2-2V31.5" />
      <path d="m8 31.5 24 16 24-16" />
      <path d="m8 54 17-13" />
      <path d="m56 54-17-13" />
    </>
  ),
  access: (
    <>
      <rect x="18" y="5" width="28" height="54" rx="5" />
      <path d="M28 11h8" />
      <path d="M29 52.5h6" />
      <rect x="25" y="21" width="6" height="6" />
      <rect x="33" y="21" width="6" height="6" />
      <rect x="25" y="29" width="6" height="6" />
      <path d="M33 29h2v2" />
      <path d="M37 29h2v6h-2" />
      <path d="M33 33v2h2" />
      <g className="text-brand">
        <path d="M22.5 19.5v-2h2" />
        <path d="M39.5 17.5h2v2" />
        <path d="M22.5 36.5v2h2" />
        <path d="M41.5 36.5v2h-2" />
        <circle cx="48" cy="48" r="9" fill={CARD_FILL} />
        <path d="m43.5 48.5 3 3 6-6" />
      </g>
    </>
  ),
  participate: (
    <>
      <circle cx="32" cy="32" r="7" />
      <path d="M18 56a14 14 0 0 1 28 0" />
      <circle cx="14" cy="36" r="5" />
      <path d="M4 56a10 10 0 0 1 13-9.5" />
      <circle cx="50" cy="36" r="5" />
      <path d="M60 56a10 10 0 0 0-13-9.5" />
      <g className="text-brand">
        <path d="m32 6 2.2 4.5 5 .7-3.6 3.5.9 4.9L32 17.3l-4.5 2.3.9-4.9-3.6-3.5 5-.7z" />
      </g>
    </>
  ),
  shield: (
    <>
      <path d="M32 6 52 13v15c0 13-9 22-20 27-11-5-20-14-20-27V13z" />
      <rect x="25" y="29" width="14" height="11" rx="2" />
      <path d="M28 29v-4a4 4 0 0 1 8 0v4" />
      <path d="M32 33.5v2.5" />
      <g className="text-brand">
        <circle cx="46" cy="48" r="8" fill={CARD_FILL} />
        <path d="m42 48.5 2.5 2.5 5.5-5.5" />
      </g>
    </>
  ),
};

type Props = { name: JourneyArtName } & Omit<SVGProps<SVGSVGElement>, "name">;

export default function JourneyArt({ name, className = "h-24 w-24", ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...rest}
    >
      {ART[name]}
    </svg>
  );
}
