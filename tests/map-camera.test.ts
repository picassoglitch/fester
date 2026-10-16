import { describe, expect, it } from "vitest";
import {
  clampCamera,
  defaultCamera,
  MAX_ZOOM,
  panBy,
  toScreen,
  toWorld,
  viewRect,
  zoomAt,
} from "@/components/map/camera";
import { VIEW } from "@/lib/map-layout";

const LAPTOP = [1200, 720] as const;
const PHONE = [360, 360] as const;

describe("camara del mapa", () => {
  it("en la laptop arranca viendo todo el recinto", () => {
    const cam = defaultCamera(...LAPTOP);
    expect(cam.zoom).toBe(1);
    const view = viewRect(cam, ...LAPTOP);
    expect(view.x).toBeLessThanOrEqual(0);
    expect(view.x + view.w).toBeGreaterThanOrEqual(VIEW.width);
  });

  it("en el telefono arranca mas cerca y dentro del recinto", () => {
    const cam = defaultCamera(...PHONE);
    expect(cam.zoom).toBeGreaterThan(1);
    const view = viewRect(cam, ...PHONE);
    expect(view.x).toBeGreaterThanOrEqual(0);
    expect(view.x + view.w).toBeLessThanOrEqual(VIEW.width + 0.001);
  });

  it("pixel y lienzo van y vienen", () => {
    const cam = { cx: 700, cy: 400, zoom: 2 };
    const w = toWorld(cam, ...PHONE, 120, 300);
    const s = toScreen(cam, ...PHONE, w);
    expect(s.x).toBeCloseTo(120);
    expect(s.y).toBeCloseTo(300);
  });

  it("el zoom deja fijo lo que esta bajo el dedo", () => {
    const cam = { cx: 800, cy: 480, zoom: 1.5 };
    const before = toWorld(cam, ...LAPTOP, 500, 300);
    const next = zoomAt(cam, ...LAPTOP, 1.4, 500, 300);
    const after = toWorld(next, ...LAPTOP, 500, 300);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it("no se aleja mas que el recinto completo ni se acerca de mas", () => {
    expect(zoomAt({ cx: 800, cy: 480, zoom: 1 }, ...LAPTOP, 0.5, 10, 10).zoom).toBe(1);
    expect(zoomAt({ cx: 800, cy: 480, zoom: 3 }, ...LAPTOP, 10, 10, 10).zoom).toBe(MAX_ZOOM);
  });

  it("no se puede arrastrar el recinto fuera del cuadro", () => {
    const cam = panBy({ cx: 800, cy: 480, zoom: 2 }, ...LAPTOP, 99999, 99999);
    const view = viewRect(cam, ...LAPTOP);
    expect(view.x).toBeCloseTo(0);
    expect(view.y).toBeCloseTo(0);
    const centered = clampCamera({ cx: 0, cy: 0, zoom: 1 }, ...LAPTOP);
    expect(centered).toMatchObject({ cx: VIEW.width / 2, cy: VIEW.height / 2 });
  });
});
