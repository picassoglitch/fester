/**
 * Geometria del mapa en vivo: el Fronton Bucareli en caricatura isometrica.
 *
 * Todo se calcula en un plano del piso visto desde arriba (x a lo largo de la
 * cancha, y a lo ancho) y `project` lo lleva a la pantalla. Al fondo a la
 * izquierda queda el frontis, al fondo a la derecha la pared lateral con los
 * cuadros numerados, al frente las gradas (una franja delgada) y a la derecha
 * el vestibulo con la mesa de premios y la puerta a Bucareli.
 *
 * Cancha y vestibulo forman un rectangulo sin muros entre si: cualquier
 * camino en linea recta entre dos lugares de la gente se queda adentro.
 */

export type Point = { x: number; y: number };

/** Lienzo de la pantalla (unidades del SVG y del canvas). */
export const VIEW = { width: 1600, height: 960 } as const;

/** Proyeccion isometrica 2:1: escala y donde cae la esquina del fondo. */
export const ISO = { k: 0.88, ox: 439, oy: 186 } as const;

/** Altura de las paredes del fondo, en unidades de pantalla. */
export const WALL_HEIGHT = 140;

/** Piso de la cancha, donde van las estaciones. */
export const COURT = { left: 0, right: 1000, top: 0, bottom: 380 } as const;

/** Franja de gradas al frente de la cancha. */
export const STANDS = { left: 0, right: 1000, top: 380, bottom: 440 } as const;

/** Vestibulo: de aqui se entra y aqui se recogen premios. */
export const LOBBY = { left: 1000, right: 1260, top: 0, bottom: 440 } as const;

/** Todo el edificio. */
export const FLOOR = { left: 0, right: 1260, top: 0, bottom: 440 } as const;

/** Mostrador de premios: centro y medidas en el piso. */
export const PRIZE_DESK = { x: 1130, y: 96, w: 120, d: 46 } as const;

/** Donde espera quien ya completo: frente al mostrador. */
export const PRIZE_AREA: Point = { x: 1115, y: 215 };

/** Puerta a la calle, en el muro de enfrente del vestibulo. */
export const DOOR: Point = { x: 1290, y: 320 };

/** Medidas del kiosko de cada estacion, en el piso. */
export const BOOTH = { w: 64, d: 44 } as const;

/** Lleva un punto del piso (a `z` de altura) a la pantalla. */
export function project(p: Point, z = 0): Point {
  return {
    x: ISO.ox + (p.x - p.y) * ISO.k,
    y: ISO.oy + ((p.x + p.y) * ISO.k) / 2 - z,
  };
}

/** El punto del piso que queda bajo un punto de la pantalla. */
export function unproject(s: Point): Point {
  const a = (s.x - ISO.ox) / ISO.k;
  const b = ((s.y - ISO.oy) * 2) / ISO.k;
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

/** Profundidad para ordenar el dibujo: lo de mas al frente va al final. */
export function depth(p: Point): number {
  return p.x + p.y;
}

function rowsFor(n: number): number {
  return n <= 4 ? 1 : n <= 10 ? 2 : 3;
}

const ROW_YS: Record<number, number[]> = { 1: [195], 2: [100, 284], 3: [64, 190, 316] };
const COL_LEFT = COURT.left + 125;
const COL_RIGHT = COURT.right - 115;

/**
 * Donde va cada estacion. Hasta 4 en una fila; hasta 10 en dos; mas, en tres.
 * Cada fila reparte su largo en partes iguales.
 */
export function stationSpots(ids: readonly string[]): Map<string, Point> {
  const n = ids.length;
  const rows = rowsFor(n);
  const perRow = Math.ceil(n / rows);

  const spots = new Map<string, Point>();
  ids.forEach((id, index) => {
    const row = Math.floor(index / perRow);
    const inRow = Math.min(perRow, n - row * perRow);
    const col = index - row * perRow;
    const x = inRow === 1 ? (COL_LEFT + COL_RIGHT) / 2 : COL_LEFT + ((COL_RIGHT - COL_LEFT) * col) / (inRow - 1);
    spots.set(id, { x, y: ROW_YS[rows][row] });
  });
  return spots;
}

export type Ring = { inner: number; outer: number };

/** Anillo de gente por defecto (pocas estaciones, mucho espacio). */
export const DEFAULT_RING: Ring = { inner: 62, outer: 110 };

/** Nadie se para dentro del kiosko. */
export const MIN_INNER = 40;

/**
 * El anillo de gente se achica cuando las estaciones quedan cerca, para que
 * nadie parezca estar formado en el kiosko de al lado.
 */
export function crowdRing(count: number): Ring {
  const rows = rowsFor(count);
  const perRow = Math.ceil(count / rows);
  const colGap = perRow > 1 ? (COL_RIGHT - COL_LEFT) / (perRow - 1) : Infinity;
  const ys = ROW_YS[rows];
  const rowGap = rows > 1 ? ys[1] - ys[0] : Infinity;
  const outer = Math.min(DEFAULT_RING.outer, colGap / 2 - 4, rowGap / 2 - 4);
  return { inner: Math.max(MIN_INNER, Math.min(DEFAULT_RING.inner, outer - 34)), outer };
}

/** FNV-1a: el mismo id siempre cae en el mismo lugar de la bola de gente. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Dos numeros en [0, 1) estables por id. */
export function unitPair(id: string): [number, number] {
  const h = hash(id);
  const h2 = hash(`${id}~`);
  return [(h % 10007) / 10007, (h2 % 10007) / 10007];
}

/**
 * Lugar de una persona alrededor de un punto del piso: un anillo desde
 * `inner` hasta `outer`, repartido de forma pareja, para que la gente quede
 * escalonada y no encimada sobre el kiosko.
 */
export function crowdSlot(
  center: Point,
  id: string,
  inner = DEFAULT_RING.inner,
  outer = DEFAULT_RING.outer,
): Point {
  const [a, b] = unitPair(id);
  const angle = a * Math.PI * 2;
  const radius = Math.sqrt(inner * inner + b * (outer * outer - inner * inner));
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
}

/** Lugar frente al mostrador de premios, sin salirse del vestibulo. */
export function prizeSlot(id: string): Point {
  const slot = crowdSlot(PRIZE_AREA, id, 0, 84);
  return {
    // Sin tapar el tapete de la puerta (los ultimos 60 del vestibulo).
    x: Math.min(LOBBY.right - 62, Math.max(LOBBY.left + 18, slot.x)),
    y: Math.min(COURT.bottom - 24, Math.max(PRIZE_DESK.y + PRIZE_DESK.d / 2 + 22, slot.y)),
  };
}
