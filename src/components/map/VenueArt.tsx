import { COURT, DOOR, LOBBY, PRIZE_DESK, VIEW, type Point } from "@/lib/map-layout";

export type BoothInfo = {
  id: string;
  name: string;
  emoji: string;
  active: boolean;
  spot: Point;
  count: number;
};

/** Numeros pintados en la pared lateral, como los cuadros de un fronton. */
const LINES = Array.from({ length: 14 }, (_, i) => i + 1);
const LINE_GAP = (COURT.right - COURT.left) / LINES.length;

/** Filas de las gradas (de la cancha hacia el fondo). */
const STANDS = [0, 1, 2, 3, 4];

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function Booth({ booth }: { booth: BoothInfo }) {
  const { x, y } = booth.spot;
  return (
    <g opacity={booth.active ? 1 : 0.5}>
      {/* Tapete donde se forma la gente */}
      <ellipse cx={x} cy={y + 8} rx={132} ry={84} fill="#ffffff" opacity={0.07} />
      <ellipse
        cx={x}
        cy={y + 8}
        rx={104}
        ry={62}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.18}
        strokeDasharray="6 8"
      />
      {/* Kiosko con toldo rojo Fester */}
      <rect x={x - 34} y={y - 34} width={68} height={40} rx={6} fill="#f4efe4" stroke="#1d2b3a" strokeWidth={2} />
      <path
        d={`M ${x - 40} ${y - 34} h 80 l -6 -14 h -68 z`}
        fill="#e2001a"
        stroke="#1d2b3a"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {[-24, -8, 8, 24].map((dx) => (
        <rect key={dx} x={x + dx - 4} y={y - 48} width={8} height={14} fill="#ffffff" opacity={0.85} />
      ))}
      <text x={x} y={y - 6} textAnchor="middle" fontSize={24}>
        {booth.emoji}
      </text>
    </g>
  );
}

/** Nombre y contador de la estacion: van encima de los personajes. */
function BoothLabel({ booth }: { booth: BoothInfo }) {
  const { x, y } = booth.spot;
  return (
    <g opacity={booth.active ? 1 : 0.5}>
      <rect x={x - 70} y={y + 12} width={140} height={22} rx={11} fill="#002a52" opacity={0.92} />
      <text x={x} y={y + 27.5} textAnchor="middle" fontSize={13} fontWeight={700} fill="#ffffff">
        {truncate(booth.name, 18)}
      </text>
      <g transform={`translate(${x + 40} ${y - 46})`}>
        <circle r={15} fill={booth.count > 0 ? "#f5b301" : "#9fb3c8"} stroke="#1d2b3a" strokeWidth={2} />
        <text y={5} textAnchor="middle" fontSize={13} fontWeight={800} fill="#1d2b3a">
          {booth.count}
        </text>
      </g>
    </g>
  );
}

/**
 * Capa de letreros: nombres, contadores y la mesa de premios. Se pinta sobre
 * el canvas para que la gente no los tape.
 */
export function VenueLabels({ booths, prizeCount }: { booths: BoothInfo[]; prizeCount: number }) {
  return (
    <svg
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className="pointer-events-none absolute inset-0 h-full w-full select-none"
      aria-hidden
    >
      {booths.map((booth) => (
        <BoothLabel key={booth.id} booth={booth} />
      ))}
      <g>
        <rect x={PRIZE_DESK.x - 80} y={PRIZE_DESK.y - 26} width={160} height={44} rx={8} fill="#f5b301" stroke="#1d2b3a" strokeWidth={3} />
        <text x={PRIZE_DESK.x} y={PRIZE_DESK.y + 4} textAnchor="middle" fontSize={17} fontWeight={800} fill="#1d2b3a">
          🎁 PREMIOS
        </text>
        <g transform={`translate(${PRIZE_DESK.x + 80} ${PRIZE_DESK.y - 26})`}>
          <circle r={15} fill={prizeCount > 0 ? "#23c77f" : "#9fb3c8"} stroke="#1d2b3a" strokeWidth={2} />
          <text y={5} textAnchor="middle" fontSize={13} fontWeight={800} fill="#1d2b3a">
            {prizeCount}
          </text>
        </g>
      </g>
    </svg>
  );
}

/**
 * El Fronton Bucareli en caricatura: estatico salvo los kioskos de las
 * estaciones y sus contadores. Los personajes se dibujan encima en un canvas.
 */
export default function VenueArt({ booths }: { booths: BoothInfo[] }) {
  const courtW = COURT.right - COURT.left;
  return (
    <svg
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className="absolute inset-0 h-full w-full select-none"
      role="img"
      aria-label="Mapa caricaturizado del Frontón Bucareli con las estaciones del Encuentro"
    >
      <defs>
        <pattern id="tiles" width={40} height={40} patternUnits="userSpaceOnUse">
          <rect width={40} height={40} fill="#efe3c8" />
          <rect width={20} height={20} fill="#d9a77a" />
          <rect x={20} y={20} width={20} height={20} fill="#d9a77a" />
        </pattern>
        <pattern id="fluting" width={22} height={90} patternUnits="userSpaceOnUse">
          <rect width={22} height={90} fill="#eadfc5" />
          <rect x={9} width={4} height={90} fill="#d8c9a6" />
        </pattern>
        <linearGradient id="court" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2e7a6b" />
          <stop offset="1" stopColor="#24604f" />
        </linearGradient>
        <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d2240" />
          <stop offset="1" stopColor="#163a63" />
        </linearGradient>
      </defs>

      {/* Calle / exterior */}
      <rect width={VIEW.width} height={VIEW.height} fill="url(#night)" />

      {/* Cascaron del edificio */}
      <rect x={20} y={40} width={1560} height={840} rx={18} fill="#c9b48c" stroke="#1d2b3a" strokeWidth={4} />

      {/* Pared lateral (arriba) con estrias Art Deco y los cuadros numerados */}
      <rect x={COURT.left} y={60} width={courtW} height={COURT.top - 60} fill="url(#fluting)" />
      <rect x={COURT.left} y={60} width={courtW} height={10} fill="#1d2b3a" opacity={0.75} />
      {LINES.map((n) => (
        <text
          key={n}
          x={COURT.left + LINE_GAP * (n - 0.5)}
          y={126}
          textAnchor="middle"
          fontSize={22}
          fontWeight={800}
          fill="#b3261e"
          fontFamily="Georgia, serif"
        >
          {n}
        </text>
      ))}
      {/* Letrero del recinto */}
      <g transform={`translate(${COURT.left + courtW / 2} 46)`}>
        <rect x={-190} y={-22} width={380} height={40} rx={6} fill="#1d2b3a" />
        <text y={6} textAnchor="middle" fontSize={22} fontWeight={800} letterSpacing={6} fill="#f5b301">
          FRONTÓN BUCARELI
        </text>
      </g>

      {/* Frontis (pared del fondo, izquierda) */}
      <rect x={40} y={60} width={COURT.left - 40} height={COURT.bottom + 20 - 60} fill="#8d97a0" stroke="#1d2b3a" strokeWidth={3} />
      {[160, 300, 440, 580].map((y) => (
        <line key={y} x1={40} x2={COURT.left} y1={y} y2={y} stroke="#6f7a84" strokeWidth={2} />
      ))}
      <rect x={40} y={COURT.bottom - 10} width={COURT.left - 40} height={8} fill="#b3261e" />
      <rect x={40} y={70} width={COURT.left - 40} height={8} fill="#b3261e" />
      <text
        x={95}
        y={360}
        textAnchor="middle"
        fontSize={18}
        fontWeight={800}
        letterSpacing={4}
        fill="#1d2b3a"
        opacity={0.55}
        transform="rotate(-90 95 360)"
      >
        FRONTIS
      </text>

      {/* Cancha */}
      <rect x={COURT.left} y={COURT.top} width={courtW} height={COURT.bottom - COURT.top} fill="url(#court)" />
      {LINES.map((n) => (
        <line
          key={n}
          x1={COURT.left + LINE_GAP * n}
          x2={COURT.left + LINE_GAP * n}
          y1={COURT.top}
          y2={COURT.bottom}
          stroke="#ffffff"
          strokeOpacity={n % 4 === 0 ? 0.28 : 0.1}
          strokeWidth={n % 4 === 0 ? 3 : 2}
        />
      ))}
      <rect
        x={COURT.left + 8}
        y={COURT.top + 8}
        width={courtW - 16}
        height={COURT.bottom - COURT.top - 16}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.35}
        strokeWidth={3}
      />
      {/* Manta del evento */}
      <g transform={`translate(${COURT.left + courtW / 2} ${COURT.top + 26})`}>
        <rect x={-150} y={-14} width={300} height={28} rx={4} fill="#e2001a" />
        <text y={6} textAnchor="middle" fontSize={15} fontWeight={800} letterSpacing={2} fill="#ffffff">
          ENCUENTRO FESTER 2026
        </text>
      </g>

      {/* Red de proteccion y gradas */}
      <line
        x1={COURT.left}
        x2={COURT.right}
        y1={COURT.bottom + 6}
        y2={COURT.bottom + 6}
        stroke="#e6edf3"
        strokeWidth={3}
        strokeDasharray="2 6"
      />
      {STANDS.map((row) => {
        const y = COURT.bottom + 22 + row * 42;
        return (
          <g key={row}>
            <rect x={COURT.left} y={y} width={courtW} height={42} fill={row % 2 ? "#7a3b2e" : "#8e4636"} />
            <rect x={COURT.left} y={y} width={courtW} height={6} fill="#5b2a20" />
            {Array.from({ length: 28 }, (_, i) => (
              <rect
                key={i}
                x={COURT.left + 14 + i * (courtW / 28)}
                y={y + 12}
                width={courtW / 28 - 14}
                height={20}
                rx={4}
                fill="#c23b2b"
                opacity={0.9}
              />
            ))}
          </g>
        );
      })}
      <text
        x={COURT.left + courtW / 2}
        y={COURT.bottom + 22 + STANDS.length * 42 + 30}
        textAnchor="middle"
        fontSize={14}
        fontWeight={700}
        letterSpacing={6}
        fill="#1d2b3a"
        opacity={0.7}
      >
        GRADAS
      </text>

      {/* Vestibulo */}
      <rect
        x={LOBBY.left}
        y={LOBBY.top}
        width={LOBBY.right - LOBBY.left}
        height={LOBBY.bottom - LOBBY.top - 20}
        fill="url(#tiles)"
        opacity={0.95}
      />
      <line x1={LOBBY.left} x2={LOBBY.left} y1={LOBBY.top} y2={COURT.top} stroke="#1d2b3a" strokeWidth={4} />
      <line x1={LOBBY.left} x2={LOBBY.left} y1={COURT.bottom + 6} y2={LOBBY.bottom} stroke="#1d2b3a" strokeWidth={4} />
      <text x={(LOBBY.left + LOBBY.right) / 2} y={110} textAnchor="middle" fontSize={15} fontWeight={800} letterSpacing={3} fill="#1d2b3a">
        VESTÍBULO
      </text>

      {/* Entrada Art Deco a la calle */}
      <g>
        <rect x={DOOR.x - 60} y={DOOR.y - 14} width={120} height={34} fill="#1d2b3a" />
        <path d={`M ${DOOR.x - 74} ${DOOR.y - 14} L ${DOOR.x} ${DOOR.y - 52} L ${DOOR.x + 74} ${DOOR.y - 14} Z`} fill="#b3261e" stroke="#1d2b3a" strokeWidth={3} />
        <text x={DOOR.x} y={DOOR.y - 21} textAnchor="middle" fontSize={11} fontWeight={800} letterSpacing={2} fill="#f5b301">
          ENTRADA
        </text>
        <text x={DOOR.x} y={DOOR.y + 8} textAnchor="middle" fontSize={11} fontWeight={700} letterSpacing={1} fill="#efe3c8">
          BUCARELI
        </text>
      </g>

      {booths.map((booth) => (
        <Booth key={booth.id} booth={booth} />
      ))}
    </svg>
  );
}
