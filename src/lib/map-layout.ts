/**
 * Geometria del mapa en vivo: un Fronton Bucareli caricaturizado en un lienzo
 * de 1600 x 900 unidades. La cancha va a lo largo, con el frontis a la
 * izquierda, la pared lateral arriba y las gradas abajo; a la derecha el
 * vestibulo con la mesa de premios y la puerta a Bucareli.
 */

export type Point = { x: number; y: number };

export const VIEW = { width: 1600, height: 900 } as const;

/** Piso de la cancha donde van las estaciones. */
export const COURT = { left: 150, right: 1320, top: 150, bottom: 600 } as const;

/** Vestibulo (derecha): de aqui se entra y aqui se recogen premios. */
export const LOBBY = { left: 1320, right: 1580, top: 60, bottom: 880 } as const;

export const PRIZE_DESK: Point = { x: 1450, y: 400 };
export const DOOR: Point = { x: 1450, y: 860 };
/** Paso obligado entre la cancha y la puerta, para no cruzar las gradas. */
export const LOBBY_HUB: Point = { x: 1400, y: 560 };

/**
 * Donde va cada estacion. Hasta 4 en una fila; hasta 10 en dos; mas, en tres.
 * Cada fila reparte su ancho en partes iguales.
 */
export function stationSpots(ids: readonly string[]): Map<string, Point> {
  const n = ids.length;
  const rows = n <= 4 ? 1 : n <= 10 ? 2 : 3;
  const rowYs =
    rows === 1 ? [380] : rows === 2 ? [270, 480] : [235, 375, 515];
  const perRow = Math.ceil(n / rows);
  const left = COURT.left + 140;
  const right = COURT.right - 135;

  const spots = new Map<string, Point>();
  ids.forEach((id, index) => {
    const row = Math.floor(index / perRow);
    const inRow = Math.min(perRow, n - row * perRow);
    const col = index - row * perRow;
    const x = inRow === 1 ? (left + right) / 2 : left + ((right - left) * col) / (inRow - 1);
    spots.set(id, { x, y: rowYs[row] });
  });
  return spots;
}

export type Ring = { inner: number; outer: number };

/** Anillo de gente por defecto (pocas estaciones, mucho espacio). */
export const DEFAULT_RING: Ring = { inner: 84, outer: 128 };

/**
 * El anillo de gente se achica cuando las estaciones quedan cerca, para que
 * nadie parezca estar formado en el kiosko de al lado.
 */
export function crowdRing(count: number): Ring {
  const rows = count <= 4 ? 1 : count <= 10 ? 2 : 3;
  const perRow = Math.ceil(count / rows);
  const width = COURT.right - 135 - (COURT.left + 140);
  const colGap = perRow > 1 ? width / (perRow - 1) : Infinity;
  const rowGap = rows === 1 ? Infinity : rows === 2 ? 210 : 140;
  const outer = Math.min(DEFAULT_RING.outer, colGap / 2 - 6, rowGap / (2 * 0.62) - 6);
  return { inner: Math.min(DEFAULT_RING.inner, outer - 22), outer };
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
 * Lugar de una persona alrededor de un punto: un anillo desde `inner` hasta
 * `outer`, repartido de forma pareja, para que la gente quede escalonada y no
 * encimada sobre el kiosko.
 */
export function crowdSlot(center: Point, id: string, inner = 84, outer = 128): Point {
  const [a, b] = unitPair(id);
  const angle = a * Math.PI * 2;
  const radius = Math.sqrt(inner * inner + b * (outer * outer - inner * inner));
  // El anillo es mas bajo que ancho: perspectiva de vista aerea.
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius * 0.62 };
}

export function prizeSlot(id: string): Point {
  // Fila frente a la mesa (abajo), sin taparla.
  const slot = crowdSlot({ x: PRIZE_DESK.x, y: PRIZE_DESK.y + 120 }, id, 0, 105);
  return {
    x: Math.min(LOBBY.right - 22, Math.max(LOBBY.left + 22, slot.x)),
    y: Math.max(PRIZE_DESK.y + 60, slot.y),
  };
}

function inLobby(point: Point): boolean {
  return point.x >= LOBBY.left;
}

/**
 * Los puntos por los que camina alguien de `from` a `to`. Entre la puerta y la
 * cancha pasa por el vestibulo para no atravesar las gradas.
 */
export function route(from: Point, to: Point): Point[] {
  const toDoor = to.y > COURT.bottom && inLobby(to);
  const fromDoor = from.y > COURT.bottom && inLobby(from);
  if ((toDoor && !inLobby(from)) || (fromDoor && !inLobby(to))) return [LOBBY_HUB, to];
  return [to];
}
