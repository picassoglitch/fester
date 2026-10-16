import { VIEW, type Point } from "@/lib/map-layout";

/**
 * Camara del mapa: que parte del lienzo se ve y a que zoom. `zoom` 1 es el
 * recinto completo dentro del cuadro; el cuadro puede tener cualquier forma
 * (horizontal en la laptop, vertical en el telefono).
 */
export type Camera = { cx: number; cy: number; zoom: number };

export const MAX_ZOOM = 4;

/** Pixeles por unidad con zoom 1: el recinto entero cabe. */
export function fitScale(width: number, height: number): number {
  return Math.min(width / VIEW.width, height / VIEW.height);
}

/** La ventana del lienzo que se ve, en unidades, y los pixeles por unidad. */
export function viewRect(cam: Camera, width: number, height: number) {
  const scale = fitScale(width, height) * cam.zoom;
  const w = width / scale;
  const h = height / scale;
  return { x: cam.cx - w / 2, y: cam.cy - h / 2, w, h, scale };
}

function clampAxis(center: number, visible: number, total: number): number {
  if (visible >= total) return total / 2;
  return Math.min(total - visible / 2, Math.max(visible / 2, center));
}

/** Zoom entre 1 y MAX_ZOOM y sin poder arrastrar el recinto fuera del cuadro. */
export function clampCamera(cam: Camera, width: number, height: number): Camera {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, cam.zoom));
  const { w, h } = viewRect({ ...cam, zoom }, width, height);
  return {
    zoom,
    cx: clampAxis(cam.cx, w, VIEW.width),
    cy: clampAxis(cam.cy, h, VIEW.height),
  };
}

/** El punto del lienzo bajo un pixel del cuadro. */
export function toWorld(cam: Camera, width: number, height: number, px: number, py: number): Point {
  const view = viewRect(cam, width, height);
  return { x: view.x + px / view.scale, y: view.y + py / view.scale };
}

/** El pixel del cuadro donde cae un punto del lienzo. */
export function toScreen(cam: Camera, width: number, height: number, p: Point): Point {
  const view = viewRect(cam, width, height);
  return { x: (p.x - view.x) * view.scale, y: (p.y - view.y) * view.scale };
}

/** Acerca o aleja dejando fijo lo que esta bajo el pixel (px, py). */
export function zoomAt(
  cam: Camera,
  width: number,
  height: number,
  factor: number,
  px: number,
  py: number,
): Camera {
  const anchor = toWorld(cam, width, height, px, py);
  const zoom = Math.min(MAX_ZOOM, Math.max(1, cam.zoom * factor));
  const scale = fitScale(width, height) * zoom;
  return clampCamera(
    { zoom, cx: anchor.x - px / scale + width / scale / 2, cy: anchor.y - py / scale + height / scale / 2 },
    width,
    height,
  );
}

/** Mueve la camara siguiendo un arrastre de (dx, dy) pixeles. */
export function panBy(cam: Camera, width: number, height: number, dx: number, dy: number): Camera {
  const scale = fitScale(width, height) * cam.zoom;
  return clampCamera({ ...cam, cx: cam.cx - dx / scale, cy: cam.cy - dy / scale }, width, height);
}

/** Punto (en pantalla) en que arranca centrado el telefono: deja ver la mesa de premios. */
const PHONE_CENTER = { x: 950, y: 520 };
/** Zoom inicial maximo en un cuadro angosto: se ve buena parte del recinto. */
const PHONE_ZOOM = 1.45;

/**
 * Camara inicial: en la laptop el recinto completo; en un cuadro angosto
 * (telefono) se acerca un poco para que la gente se distinga.
 */
export function defaultCamera(width: number, height: number): Camera {
  const fit = fitScale(width, height);
  const cover = Math.max(width / VIEW.width, height / VIEW.height);
  const zoom = Math.min(PHONE_ZOOM, Math.max(1, cover / fit));
  if (zoom === 1) return clampCamera({ zoom, cx: VIEW.width / 2, cy: VIEW.height / 2 }, width, height);
  return clampCamera({ zoom, cx: PHONE_CENTER.x, cy: PHONE_CENTER.y }, width, height);
}
