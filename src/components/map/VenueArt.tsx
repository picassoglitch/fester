import type { Ref } from "react";
import {
  COURT,
  DOOR,
  FLOOR,
  ISO,
  LOBBY,
  PRIZE_DESK,
  project,
  STANDS,
  VIEW,
  WALL_HEIGHT,
  type Point,
} from "@/lib/map-layout";
import { BOOTH_TOP } from "@/components/map/scene";

export type BoothInfo = {
  id: string;
  name: string;
  emoji: string;
  active: boolean;
  spot: Point;
  count: number;
};

const K = ISO.k;
const W = FLOOR.bottom; // ancho del edificio (eje y del piso)
const T = 18; // grueso de la losa

/**
 * Planos del dibujo: con estas matrices se dibuja en coordenadas del piso o
 * de cada pared y el SVG lo inclina a la vista isometrica.
 */
const PLANE = {
  /** Piso: (x, y) del plano. */
  floor: `matrix(${K} ${K / 2} ${-K} ${K / 2} ${ISO.ox} ${ISO.oy})`,
  /** Pared lateral del fondo (y = 0): (x, -altura). */
  sideWall: `matrix(${K} ${K / 2} 0 1 ${ISO.ox} ${ISO.oy})`,
  /** Frontis (x = 0): (distancia desde el frente, -altura). */
  frontis: `matrix(${K} ${-K / 2} 0 1 ${ISO.ox - W * K} ${ISO.oy + (W * K) / 2})`,
  /** Canto de la losa al frente izquierdo (y = W): (x, profundidad). */
  frontLeft: `matrix(${K} ${K / 2} 0 1 ${ISO.ox - W * K} ${ISO.oy + (W * K) / 2})`,
  /** Canto de la losa al frente derecho (x = FLOOR.right): (distancia desde el frente, profundidad). */
  frontRight: `matrix(${K} ${-K / 2} 0 1 ${ISO.ox + (FLOOR.right - W) * K} ${ISO.oy + ((FLOOR.right + W) * K) / 2})`,
} as const;

/** Cuadros numerados del fronton, pintados en la pared y en el piso. */
const CUADROS = Array.from({ length: 14 }, (_, i) => i + 1);
const CUADRO = (COURT.right - COURT.left) / CUADROS.length;
const COURT_W = COURT.right - COURT.left;
const COURT_D = COURT.bottom - COURT.top;
const LOBBY_W = LOBBY.right - LOBBY.left;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Nombre y contador de la estacion, encima del toldo. */
function BoothLabel({ booth }: { booth: BoothInfo }) {
  const top = project(booth.spot, BOOTH_TOP + 22);
  const name = truncate(booth.name, 16);
  const w = Math.max(64, name.length * 7.8 + 26);
  return (
    <g opacity={booth.active ? 1 : 0.55} transform={`translate(${top.x} ${top.y})`}>
      <rect x={-w / 2} y={-12} width={w} height={24} rx={12} fill="#0b1f3a" opacity={0.92} stroke="#ffffff" strokeOpacity={0.25} />
      <text y={4.5} textAnchor="middle" fontSize={13} fontWeight={700} fill="#ffffff">
        {name}
      </text>
      <g key={booth.count} className="map-bump" transform={`translate(${w / 2 + 2} -10)`}>
        <circle r={14} fill={booth.count > 0 ? "#f5b301" : "#9fb3c8"} stroke="#14213a" strokeWidth={2} />
        <text y={4.5} textAnchor="middle" fontSize={13} fontWeight={800} fill="#14213a">
          {booth.count}
        </text>
      </g>
    </g>
  );
}

/**
 * Capa de letreros: nombres, contadores y la mesa de premios. Va encima del
 * canvas para que la gente no los tape.
 */
export function VenueLabels({
  ref,
  booths,
  prizeCount,
}: {
  ref?: Ref<SVGSVGElement>;
  booths: BoothInfo[];
  prizeCount: number;
}) {
  const desk = project({ x: PRIZE_DESK.x, y: PRIZE_DESK.y }, 92);
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className="pointer-events-none absolute inset-0 h-full w-full select-none"
      aria-hidden
    >
      {booths.map((booth) => (
        <BoothLabel key={booth.id} booth={booth} />
      ))}
      <g transform={`translate(${desk.x} ${desk.y})`}>
        <rect x={-62} y={-15} width={124} height={30} rx={15} fill="#f5b301" stroke="#14213a" strokeWidth={2.5} />
        <text y={5.5} textAnchor="middle" fontSize={15} fontWeight={800} fill="#14213a">
          🎁 PREMIOS
        </text>
        <g key={prizeCount} className="map-bump" transform="translate(64 -12)">
          <circle r={14} fill={prizeCount > 0 ? "#23c77f" : "#9fb3c8"} stroke="#14213a" strokeWidth={2} />
          <text y={4.5} textAnchor="middle" fontSize={13} fontWeight={800} fill="#14213a">
            {prizeCount}
          </text>
        </g>
      </g>
    </svg>
  );
}

/**
 * El Fronton Bucareli en caricatura isometrica, sin la gente ni los kioskos
 * (esos van en el canvas para taparse bien entre si).
 */
export default function VenueArt({ ref }: { ref?: Ref<SVGSVGElement> }) {
  const doorS = W - DOOR.y; // posicion de la puerta en el canto derecho
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      className="absolute inset-0 h-full w-full select-none"
      role="img"
      aria-label="Mapa isométrico en caricatura del Frontón Bucareli con las estaciones del Encuentro"
    >
      <defs>
        <radialGradient id="iso-sky" cx="0.5" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#123a66" />
          <stop offset="1" stopColor="#061529" />
        </radialGradient>
        <linearGradient id="iso-court" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f8573" />
          <stop offset="1" stopColor="#226352" />
        </linearGradient>
        <radialGradient id="iso-spot" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.14} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
        <pattern id="iso-tiles" width={40} height={40} patternUnits="userSpaceOnUse">
          <rect width={40} height={40} fill="#efe3c8" />
          <rect width={20} height={20} fill="#d9a77a" />
          <rect x={20} y={20} width={20} height={20} fill="#d9a77a" />
        </pattern>
        <pattern id="iso-fluting" width={24} height={WALL_HEIGHT} patternUnits="userSpaceOnUse">
          <rect width={24} height={WALL_HEIGHT} fill="#efe4c9" />
          <rect x={10} width={5} height={WALL_HEIGHT} fill="#ddcfaf" />
        </pattern>
        <pattern id="iso-blocks" width={88} height={35} patternUnits="userSpaceOnUse">
          <rect width={88} height={35} fill="#9aa4ad" />
          <path d="M0 0.5H88M44 0V35" stroke="#7d8892" strokeWidth={1.5} />
          <path d="M0 18H88M0 18V35M88 18V35" stroke="#7d8892" strokeWidth={1.5} />
        </pattern>
      </defs>

      {/* Noche de fondo con un brillo suave detras del recinto */}
      <rect width={VIEW.width} height={VIEW.height} fill="url(#iso-sky)" />
      {Array.from({ length: 36 }, (_, i) => (
        <circle
          key={i}
          cx={(i * 397) % VIEW.width}
          cy={(i * 211) % 180}
          r={i % 3 === 0 ? 1.6 : 1}
          fill="#ffffff"
          opacity={0.25 + (i % 4) * 0.1}
        />
      ))}

      {/* Cantos de la losa (dan el grueso del piso) */}
      <g transform={PLANE.frontLeft}>
        <rect x={0} y={0} width={FLOOR.right} height={T} fill="#7c6545" />
        <rect x={0} y={0} width={FLOOR.right} height={3} fill="#a88f66" />
      </g>
      <g transform={PLANE.frontRight}>
        <rect x={0} y={0} width={W} height={T} fill="#5f4c33" />
        <rect x={0} y={0} width={W} height={3} fill="#8c7653" />
      </g>

      {/* Piso */}
      <g transform={PLANE.floor}>
        {/* Cancha con sus cuadros */}
        <rect x={COURT.left} y={COURT.top} width={COURT_W} height={COURT_D} fill="url(#iso-court)" />
        <ellipse cx={COURT_W / 2} cy={COURT_D / 2} rx={COURT_W * 0.55} ry={COURT_D * 0.75} fill="url(#iso-spot)" />
        {CUADROS.slice(0, -1).map((n) => (
          <line
            key={n}
            x1={COURT.left + CUADRO * n}
            x2={COURT.left + CUADRO * n}
            y1={COURT.top}
            y2={COURT.bottom}
            stroke="#ffffff"
            strokeOpacity={n % 4 === 0 ? 0.3 : 0.1}
            strokeWidth={n % 4 === 0 ? 3 : 2}
          />
        ))}
        <rect
          x={COURT.left + 8}
          y={COURT.top + 8}
          width={COURT_W - 16}
          height={COURT_D - 16}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={0.4}
          strokeWidth={3}
        />

        {/* Gradas: tres escalones con butacas rojas */}
        {[0, 1, 2].map((row) => {
          const y = STANDS.top + row * 20;
          return (
            <g key={row}>
              <rect x={STANDS.left} y={y} width={STANDS.right - STANDS.left} height={20} fill={row % 2 ? "#7a3b2e" : "#8e4636"} />
              {Array.from({ length: 40 }, (_, i) => (
                <rect key={i} x={STANDS.left + 6 + i * 25} y={y + 5} width={17} height={11} rx={3} fill="#c8402f" />
              ))}
            </g>
          );
        })}
        <line x1={COURT.left} x2={COURT.right} y1={STANDS.top + 1} y2={STANDS.top + 1} stroke="#e6edf3" strokeWidth={3} strokeDasharray="2 7" />

        {/* Vestibulo */}
        <rect x={LOBBY.left} y={LOBBY.top} width={LOBBY_W} height={LOBBY.bottom - LOBBY.top} fill="url(#iso-tiles)" />
        <rect x={LOBBY.left - 3} y={LOBBY.top} width={6} height={COURT.bottom} fill="#f5b301" opacity={0.85} />
        {/* Tapete rojo de la puerta a la mesa de premios */}
        <rect x={LOBBY.right - 60} y={DOOR.y - 34} width={60} height={68} rx={6} fill="#b3261e" />
        <rect x={LOBBY.right - 54} y={DOOR.y - 28} width={48} height={56} rx={4} fill="none" stroke="#f5b301" strokeWidth={2} />
      </g>

      {/* Pared lateral del fondo */}
      <g transform={PLANE.sideWall}>
        <rect x={0} y={-WALL_HEIGHT} width={COURT.right} height={WALL_HEIGHT} fill="url(#iso-fluting)" />
        <rect x={0} y={-WALL_HEIGHT} width={COURT.right} height={12} fill="#14213a" opacity={0.85} />
        <rect x={0} y={-8} width={COURT.right} height={8} fill="#b3261e" />
        {CUADROS.map((n) => (
          <text
            key={n}
            x={CUADRO * (n - 0.5)}
            y={-20}
            textAnchor="middle"
            fontSize={20}
            fontWeight={800}
            fill="#b3261e"
            fontFamily="Georgia, serif"
          >
            {n}
          </text>
        ))}
        {/* Letrero del recinto y manta del evento */}
        <g transform={`translate(${COURT.right / 2} ${-WALL_HEIGHT + 40})`}>
          <rect x={-170} y={-20} width={340} height={38} rx={6} fill="#14213a" />
          <text y={7} textAnchor="middle" fontSize={21} fontWeight={800} letterSpacing={6} fill="#f5b301">
            FRONTÓN BUCARELI
          </text>
        </g>
        <g transform={`translate(${COURT.right / 2} ${-WALL_HEIGHT + 82})`}>
          <path d="M-150 -14H150L140 0L150 14H-150L-140 0Z" fill="#e2001a" />
          <text y={5.5} textAnchor="middle" fontSize={15} fontWeight={800} letterSpacing={2} fill="#ffffff">
            ENCUENTRO FESTER 2026
          </text>
        </g>

        {/* Tramo del vestibulo: muro Art Deco con ventanales */}
        <rect x={LOBBY.left} y={-WALL_HEIGHT} width={LOBBY_W} height={WALL_HEIGHT} fill="#d8c39a" />
        <rect x={LOBBY.left} y={-WALL_HEIGHT} width={LOBBY_W} height={12} fill="#14213a" opacity={0.85} />
        {[0, 1, 2].map((i) => {
          const x = LOBBY.left + 34 + i * 76;
          return (
            <g key={i}>
              <path d={`M${x} -18V-86A21 21 0 0 1 ${x + 42} -86V-18Z`} fill="#24507e" stroke="#14213a" strokeWidth={3} />
              <path d={`M${x + 21} -18V-104M${x} -60H${x + 42}`} stroke="#14213a" strokeWidth={2} />
              <path d={`M${x + 6} -70L${x + 16} -96`} stroke="#9fd0ff" strokeOpacity={0.5} strokeWidth={3} />
            </g>
          );
        })}
        <text x={LOBBY.left + LOBBY_W / 2} y={-WALL_HEIGHT + 30} textAnchor="middle" fontSize={13} fontWeight={800} letterSpacing={3} fill="#14213a">
          VESTÍBULO
        </text>
        <line x1={LOBBY.left} x2={LOBBY.left} y1={-WALL_HEIGHT} y2={0} stroke="#14213a" strokeWidth={3} />
      </g>

      {/* Frontis: el muro de piedra donde rebota la pelota */}
      <g transform={PLANE.frontis}>
        <rect x={W - COURT.bottom} y={-WALL_HEIGHT} width={COURT.bottom} height={WALL_HEIGHT} fill="url(#iso-blocks)" />
        <rect x={0} y={-WALL_HEIGHT * 0.45} width={W - COURT.bottom} height={WALL_HEIGHT * 0.45} fill="#6f5a40" />
        <rect x={W - COURT.bottom} y={-WALL_HEIGHT} width={COURT.bottom} height={12} fill="#14213a" opacity={0.85} />
        <rect x={W - COURT.bottom} y={-14} width={COURT.bottom} height={14} fill="#b3261e" />
        <rect x={W - COURT.bottom} y={-WALL_HEIGHT + 18} width={COURT.bottom} height={5} fill="#b3261e" />
        <text
          x={W - COURT.bottom / 2}
          y={-56}
          textAnchor="middle"
          fontSize={20}
          fontWeight={800}
          letterSpacing={8}
          fill="#14213a"
          opacity={0.45}
        >
          FRONTIS
        </text>
      </g>
      {/* Arista de la esquina del fondo */}
      <line x1={ISO.ox} x2={ISO.ox} y1={ISO.oy - WALL_HEIGHT} y2={ISO.oy} stroke="#14213a" strokeWidth={3} />

      {/* Entrada Art Deco a la calle Bucareli */}
      <g transform={PLANE.frontRight}>
        <path
          d={`M${doorS - 48} 0V-62L${doorS} -88L${doorS + 48} -62V0H${doorS + 36}V-56H${doorS - 36}V0Z`}
          fill="#b3261e"
          stroke="#14213a"
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <text x={doorS} y={-66} textAnchor="middle" fontSize={11} fontWeight={800} letterSpacing={2} fill="#f5b301">
          ENTRADA
        </text>
        <rect x={doorS - 46} y={6} width={92} height={22} rx={4} fill="#14213a" />
        <text x={doorS} y={21.5} textAnchor="middle" fontSize={11} fontWeight={800} letterSpacing={2} fill="#efe3c8">
          BUCARELI
        </text>
      </g>
    </svg>
  );
}
