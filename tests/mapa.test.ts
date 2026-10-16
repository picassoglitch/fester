import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applySnapshot, step, type Sprite } from "@/components/map/sprites";
import type { MapPerson } from "@/lib/map";
import {
  BOOTH,
  COURT,
  crowdRing,
  crowdSlot,
  DOOR,
  LOBBY,
  PRIZE_DESK,
  prizeSlot,
  project,
  stationSpots,
  unproject,
  VIEW,
  WALL_HEIGHT,
} from "@/lib/map-layout";
import { ensureStations, hasLocalDb, testCode } from "./db";

describe("geometria del mapa", () => {
  it("reparte las estaciones dentro de la cancha, en filas, con su anillo completo", () => {
    for (const n of [1, 3, 4, 6, 10, 14]) {
      const ids = Array.from({ length: n }, (_, i) => `s${i}`);
      const spots = [...stationSpots(ids).values()];
      const ring = crowdRing(n);
      expect(spots).toHaveLength(n);
      for (const spot of spots) {
        expect(spot.x - ring.outer).toBeGreaterThanOrEqual(COURT.left);
        expect(spot.x + ring.outer).toBeLessThanOrEqual(COURT.right);
        expect(spot.y - ring.outer).toBeGreaterThanOrEqual(COURT.top);
        expect(spot.y + ring.outer).toBeLessThanOrEqual(COURT.bottom);
      }
      const rows = new Set(spots.map((s) => s.y)).size;
      expect(rows).toBe(n <= 4 ? 1 : n <= 10 ? 2 : 3);
    }
  });

  it("los anillos de gente de estaciones vecinas no se enciman y nadie queda dentro del kiosko", () => {
    const boothHalfDiagonal = Math.hypot(BOOTH.w, BOOTH.d) / 2;
    for (let n = 1; n <= 14; n++) {
      const ring = crowdRing(n);
      const spots = [...stationSpots(Array.from({ length: n }, (_, i) => `s${i}`)).values()];
      expect(ring.inner).toBeGreaterThan(boothHalfDiagonal);
      expect(ring.outer).toBeGreaterThan(ring.inner);
      for (const a of spots)
        for (const b of spots) {
          if (a === b) continue;
          expect(Math.hypot(a.x - b.x, a.y - b.y), `${n} estaciones`).toBeGreaterThanOrEqual(2 * ring.outer);
        }
    }
  });

  it("cada quien tiene su lugar fijo, alrededor del kiosko y no encima", () => {
    const center = { x: 600, y: 200 };
    expect(crowdSlot(center, "abc")).toEqual(crowdSlot(center, "abc"));
    for (let i = 0; i < 200; i++) {
      const slot = crowdSlot(center, `persona-${i}`);
      const r = Math.hypot(slot.x - center.x, slot.y - center.y);
      expect(r).toBeGreaterThanOrEqual(62 - 0.01);
      expect(r).toBeLessThanOrEqual(110 + 0.01);
    }
  });

  it("quien espera premio queda en el vestibulo, frente al mostrador", () => {
    for (let i = 0; i < 100; i++) {
      const slot = prizeSlot(`p${i}`);
      expect(slot.y).toBeGreaterThan(PRIZE_DESK.y + PRIZE_DESK.d / 2);
      expect(slot.x).toBeGreaterThanOrEqual(LOBBY.left);
      expect(slot.x).toBeLessThanOrEqual(LOBBY.right);
      expect(slot.y).toBeLessThan(COURT.bottom);
    }
  });

  it("la puerta da al vestibulo y la linea recta a cualquier estacion no cruza las gradas", () => {
    expect(DOOR.x).toBeGreaterThanOrEqual(LOBBY.right);
    expect(DOOR.y).toBeLessThan(COURT.bottom);
  });

  it("la proyeccion isometrica va y viene, y el recinto cabe en el lienzo con sus paredes", () => {
    const p = { x: 321, y: 123 };
    const back = unproject(project(p));
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
    const corners = [
      project({ x: 0, y: 0 }, WALL_HEIGHT),
      project({ x: 0, y: 440 }),
      project({ x: 1260, y: 0 }, WALL_HEIGHT),
      project({ x: 1260, y: 440 }),
      project(DOOR),
    ];
    for (const c of corners) {
      expect(c.x).toBeGreaterThan(0);
      expect(c.x).toBeLessThan(VIEW.width);
      expect(c.y).toBeGreaterThan(0);
      expect(c.y).toBeLessThan(VIEW.height - 18);
    }
  });
});

describe("personajes", () => {
  const spots = stationSpots(["a", "b"]);
  const person = (over: Partial<MapPerson> = {}): MapPerson => ({
    id: "p1",
    name: "Ana",
    profile: "Arquitecto",
    stationId: "a",
    status: "station",
    ...over,
  });
  const walkAll = (sprites: Map<string, Sprite>) => {
    for (let i = 0; i < 400; i++) step(sprites, 0.05);
  };

  it("en la primera carga cada quien aparece ya en su estacion", () => {
    const sprites = new Map<string, Sprite>();
    applySnapshot(sprites, [person()], spots, { initial: true, instant: false });
    const sprite = sprites.get("p1")!;
    expect(sprite.path).toEqual([]);
    expect({ x: sprite.x, y: sprite.y }).toEqual(crowdSlot(spots.get("a")!, "p1"));
  });

  it("quien llega despues entra por la puerta y camina a su estacion", () => {
    const sprites = new Map<string, Sprite>();
    applySnapshot(sprites, [], spots, { initial: true, instant: false });
    applySnapshot(sprites, [person()], spots, { initial: false, instant: false });
    const sprite = sprites.get("p1")!;
    expect({ x: sprite.x, y: sprite.y }).toEqual(DOOR);
    expect(sprite.path).toEqual([crowdSlot(spots.get("a")!, "p1")]);
    walkAll(sprites);
    expect({ x: sprite.x, y: sprite.y }).toEqual(crowdSlot(spots.get("a")!, "p1"));
  });

  it("con un nuevo escaneo camina a la otra estacion", () => {
    const sprites = new Map<string, Sprite>();
    applySnapshot(sprites, [person()], spots, { initial: true, instant: false });
    applySnapshot(sprites, [person({ stationId: "b" })], spots, { initial: false, instant: false });
    walkAll(sprites);
    const sprite = sprites.get("p1")!;
    expect({ x: sprite.x, y: sprite.y }).toEqual(crowdSlot(spots.get("b")!, "p1"));
  });

  it("al completar va a la mesa de premios", () => {
    const sprites = new Map<string, Sprite>();
    applySnapshot(sprites, [person()], spots, { initial: true, instant: false });
    applySnapshot(sprites, [person({ status: "prize" })], spots, { initial: false, instant: false });
    walkAll(sprites);
    const sprite = sprites.get("p1")!;
    expect({ x: sprite.x, y: sprite.y }).toEqual(prizeSlot("p1"));
  });

  it("con el premio pasa por la mesa, sale por la puerta y desaparece", () => {
    const sprites = new Map<string, Sprite>();
    applySnapshot(sprites, [person()], spots, { initial: true, instant: false });
    applySnapshot(sprites, [person({ status: "leaving" })], spots, { initial: false, instant: false });
    const sprite = sprites.get("p1")!;
    expect(sprite.path).toEqual([prizeSlot("p1"), DOOR]);
    walkAll(sprites);
    expect(sprites.has("p1")).toBe(false);
  });

  it("quien ya no viene en el sondeo se desvanece", () => {
    const sprites = new Map<string, Sprite>();
    applySnapshot(sprites, [person()], spots, { initial: true, instant: false });
    applySnapshot(sprites, [], spots, { initial: false, instant: false });
    expect(sprites.get("p1")!.fading).toBe(true);
    walkAll(sprites);
    expect(sprites.has("p1")).toBe(false);
  });

  it("con movimiento reducido, quien ya salio no reaparece en cada sondeo", () => {
    const sprites = new Map<string, Sprite>();
    applySnapshot(sprites, [person()], spots, { initial: true, instant: true });
    applySnapshot(sprites, [person({ status: "leaving" })], spots, { initial: false, instant: true });
    walkAll(sprites);
    expect(sprites.has("p1")).toBe(false);
    applySnapshot(sprites, [person({ status: "leaving" })], spots, { initial: false, instant: true });
    expect(sprites.has("p1")).toBe(false);
  });

  it("con movimiento reducido salta directo a su lugar", () => {
    const sprites = new Map<string, Sprite>();
    applySnapshot(sprites, [person()], spots, { initial: true, instant: true });
    applySnapshot(sprites, [person({ stationId: "b" })], spots, { initial: false, instant: true });
    const sprite = sprites.get("p1")!;
    expect(sprite.path).toEqual([]);
    expect({ x: sprite.x, y: sprite.y }).toEqual(crowdSlot(spots.get("b")!, "p1"));
  });
});

describe.skipIf(!hasLocalDb)("quien sale en el mapa (base local)", () => {
  const marker = `Mapatest${Math.random().toString(36).slice(2, 8)}`;
  const codes = {
    noScans: testCode(),
    walking: testCode(),
    waiting: testCode(),
    leaving: testCode(),
    gone: testCode(),
  };

  beforeAll(async () => {
    await ensureStations();
    const { prisma } = await import("@/lib/db");
    const [first, second] = await prisma.station.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      take: 2,
    });
    const now = Date.now();
    const make = (code: string, data: object, stations: string[]) =>
      prisma.attendee.create({
        data: {
          code,
          name: `${marker} ${code}`,
          position: "Otro: estudiante",
          ...data,
          scans: {
            create: stations.map((stationId, i) => ({
              stationId,
              createdAt: new Date(now - (stations.length - i) * 60_000),
            })),
          },
        },
      });
    await make(codes.noScans, {}, []);
    await make(codes.walking, {}, [first.id, second.id]);
    await make(codes.waiting, { completedAt: new Date(now) }, [first.id]);
    await make(codes.leaving, { redeemedAt: new Date(now - 30_000) }, [first.id]);
    await make(codes.gone, { redeemedAt: new Date(now - 60 * 60_000) }, [first.id]);
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code: { in: Object.values(codes) } } });
  });

  it("solo quien ya escaneo, con su ultima estacion y su estado", async () => {
    const { prisma } = await import("@/lib/db");
    const { getMapSnapshot } = await import("@/lib/map");
    const snapshot = await getMapSnapshot();
    const ids = await prisma.attendee.findMany({
      where: { code: { in: Object.values(codes) } },
      select: { id: true, code: true, scans: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const byCode = new Map(ids.map((a) => [a.code, a]));
    const find = (code: string) => snapshot.people.find((p) => p.id === byCode.get(code)!.id);

    expect(find(codes.noScans)).toBeUndefined();
    expect(find(codes.gone)).toBeUndefined();
    expect(find(codes.walking)).toMatchObject({
      status: "station",
      profile: "Estudiante",
      stationId: byCode.get(codes.walking)!.scans[0].stationId,
    });
    expect(find(codes.waiting)?.status).toBe("prize");
    expect(find(codes.leaving)?.status).toBe("leaving");
  });

  it("trae los totales de completados y premios entregados de todo el evento", async () => {
    const { prisma } = await import("@/lib/db");
    const { getMapSnapshot } = await import("@/lib/map");
    const snapshot = await getMapSnapshot();
    const [completed, redeemed] = await Promise.all([
      prisma.attendee.count({ where: { completedAt: { not: null } } }),
      prisma.attendee.count({ where: { redeemedAt: { not: null } } }),
    ]);
    // "gone" recogio hace una hora: ya no sale en el mapa pero si cuenta.
    expect(snapshot.totals).toEqual({ completed, redeemed });
    expect(redeemed).toBeGreaterThanOrEqual(2);
  });

  it("la ruta del mapa es solo para el admin", async () => {
    const { vi } = await import("vitest");
    vi.resetModules();
    vi.doMock("@/lib/auth", () => ({
      getSession: async () => ({ id: "s", name: "S", role: "STAFF", sessionVersion: 0 }),
    }));
    const { GET } = await import("@/app/api/admin/mapa/route");
    const res = await GET();
    expect(res.status).toBe(401);
    vi.doUnmock("@/lib/auth");
    vi.resetModules();
  });
});
