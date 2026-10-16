"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import VenueArt, { VenueLabels, type BoothInfo } from "@/components/map/VenueArt";
import { applySnapshot, drawSprite, step, type Sprite } from "@/components/map/sprites";
import {
  clampCamera,
  defaultCamera,
  MAX_ZOOM,
  panBy,
  toScreen,
  viewRect,
  zoomAt,
  type Camera,
} from "@/components/map/camera";
import { BOOTH_TOP, drawBooth, drawFx, drawPrizeDesk, type Fx } from "@/components/map/scene";
import type { MapSnapshot } from "@/lib/map";
import { diffEvents } from "@/lib/map-events";
import { crowdRing, depth, PRIZE_DESK, project, stationSpots, type Point } from "@/lib/map-layout";
import { PROFILES, profileColor, profileLabel } from "@/lib/profiles";
import { relativeTime } from "@/lib/format";

const POLL_MS = 5_000;
/** Que tan cerca (en pixeles) hay que pasar el mouse o el dedo de alguien. */
const PICK_PX = { mouse: 22, touch: 32 } as const;
/** Arrastre minimo para que un toque cuente como mover el mapa. */
const DRAG_PX = 6;
/** Nombres que suben por sondeo; el resto solo destella. */
const MAX_POPS = 8;
/** Separacion entre nombres que suben del mismo kiosko. */
const POP_GAP_S = 0.55;

const DESK: Point = { x: PRIZE_DESK.x, y: PRIZE_DESK.y };

type Selection = { id: string; pinned: boolean };

function placeLabel(sprite: Sprite, stations: MapSnapshot["stations"]): string {
  if (sprite.status === "leaving") return "Ya recogió su premio · saliendo";
  if (sprite.status === "prize") return "Completó el recorrido · esperando premio";
  const station = stations.find((s) => s.id === sprite.stationId);
  return station ? `Último escaneo: ${station.emoji} ${station.name}` : "En el recinto";
}

/** Nombre y primer apellido: lo que cabe en el globo que sube. */
function shortName(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).join(" ");
}

function zoomStateOf(zoom: number): "fit" | "mid" | "max" {
  return zoom <= 1 ? "fit" : zoom >= MAX_ZOOM ? "max" : "mid";
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Numero grande que rueda hasta su valor nuevo. */
function RollingNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    if (prefersReducedMotion()) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 700);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = Math.round(start + (value - start) * eased);
      from.current = current;
      setShown(current);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{shown.toLocaleString("es-MX")}</>;
}

function StatTile({
  label,
  value,
  accent,
  index,
}: {
  label: string;
  value: number;
  accent: string;
  index: number;
}) {
  return (
    <div
      className="map-tile-in min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <p className="flex items-center gap-2 text-xs font-semibold text-white/60">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} />
        <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
      </p>
      <p className="mt-1 text-[clamp(1.75rem,5vw,2.5rem)] font-extrabold leading-none tabular-nums text-white">
        <RollingNumber value={value} />
      </p>
    </div>
  );
}

const MAP_BUTTON =
  "flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-[#0b1f3a]/85 text-lg font-bold text-white shadow-lg backdrop-blur " +
  "transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] " +
  "[@media(hover:hover)]:hover:bg-[#163a63] active:scale-95 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold " +
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";

/**
 * Mapa en vivo del Fronton Bucareli en caricatura isometrica: cada asistente
 * que ya escaneo es un personaje del color de su perfil, parado en la
 * estacion de su ultimo escaneo. Los cambios llegan por sondeo; cada escaneo
 * hace destellar su kiosko y sube el nombre de quien escaneo. En el telefono
 * se arrastra y se pellizca; en la laptop, Ctrl + rueda o los botones.
 */
export default function LiveMap({ initial }: { initial: MapSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [live, setLive] = useState(true);
  const [selection, setSelection] = useState<Selection | null>(null);
  /** Solo lo que necesitan los botones y el cursor, para no repintar en cada paso del pellizco. */
  const [zoomState, setZoomState] = useState<"fit" | "mid" | "max">("fit");
  const [, setTick] = useState(0);

  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const artRef = useRef<SVGSVGElement>(null);
  const labelsRef = useRef<SVGSVGElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const sprites = useRef(new Map<string, Sprite>());
  const effects = useRef<Fx[]>([]);
  /** Cuando empezo el ultimo destello de cada kiosko ("desk" = premios). */
  const pulses = useRef(new Map<string, number>());
  /** Cuando queda libre cada kiosko para el siguiente nombre que sube. */
  const popFree = useRef(new Map<string, number>());
  const prevPeople = useRef(initial.people);
  const firstApply = useRef(true);
  const selectedId = useRef<string | null>(null);

  const cam = useRef<Camera>({ cx: 800, cy: 480, zoom: 1 });
  const size = useRef({ w: 0, h: 0 });
  /** Pixeles del canvas por pixel CSS, del ultimo `resize`. */
  const dprRef = useRef(1);
  /** Si el usuario ya movio la camara, no se la regresamos al cambiar el tamaño. */
  const touchedCamera = useRef(false);

  const spots = useMemo(() => stationSpots(snapshot.stations.map((s) => s.id)), [snapshot.stations]);
  const ring = useMemo(() => crowdRing(snapshot.stations.length), [snapshot.stations.length]);
  const stationsById = useMemo(
    () => new Map(snapshot.stations.map((s) => [s.id, s])),
    [snapshot.stations],
  );

  const clock = () => performance.now() / 1000;

  /** Pasa la camara al SVG (viewBox) sin volver a pintar React. */
  const applyView = useCallback(() => {
    const { w, h } = size.current;
    if (!w || !h) return;
    const view = viewRect(cam.current, w, h);
    const box = `${view.x} ${view.y} ${view.w} ${view.h}`;
    artRef.current?.setAttribute("viewBox", box);
    labelsRef.current?.setAttribute("viewBox", box);
  }, []);

  const setCamera = useCallback(
    (next: Camera) => {
      cam.current = next;
      touchedCamera.current = true;
      applyView();
      setZoomState(zoomStateOf(next.zoom));
    },
    [applyView],
  );

  // Despues de cada render, por si React reescribio el viewBox.
  useLayoutEffect(() => applyView());

  // Cada sondeo mueve a los personajes y anuncia los escaneos nuevos.
  useEffect(() => {
    const reduced = prefersReducedMotion();
    applySnapshot(sprites.current, snapshot.people, spots, {
      initial: firstApply.current,
      instant: reduced,
      ring,
    });

    if (!firstApply.current && !reduced) {
      const now = clock();
      let pops = 0;
      for (const event of diffEvents(prevPeople.current, snapshot.people)) {
        const atDesk = event.kind === "prize";
        const key = atDesk ? "desk" : event.stationId;
        const at = atDesk ? DESK : spots.get(event.stationId);
        if (!at) continue;
        const start = Math.max(now, popFree.current.get(key) ?? 0);
        const color =
          event.kind === "complete" ? "#f5b301" : event.kind === "prize" ? "#23c77f" : profileColor(event.profile);
        effects.current.push({ kind: "ring", at, z: 0, start, color });
        pulses.current.set(key, start);
        if (pops >= MAX_POPS) continue;
        pops += 1;
        popFree.current.set(key, start + POP_GAP_S);
        const station = stationsById.get(event.stationId);
        effects.current.push({
          kind: "pop",
          at,
          z: atDesk ? 104 : BOOTH_TOP + 46,
          start,
          color: profileColor(event.profile),
          text: event.kind === "prize" ? `🎁 ${shortName(event.name)}` : shortName(event.name),
          sub:
            event.kind === "complete"
              ? "¡Completó el recorrido!"
              : event.kind === "prize"
                ? "Recogió su premio"
                : `${profileLabel(event.profile)} · ${station ? `${station.emoji} ${station.name}` : ""}`,
          gold: event.kind === "complete",
        });
      }
    }
    prevPeople.current = snapshot.people;
    firstApply.current = false;
  }, [snapshot, spots, ring, stationsById]);

  // Sondeo
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    let inFlight = false;

    async function refresh() {
      // Un sondeo a la vez: una respuesta vieja no debe regresar a nadie.
      if (document.hidden || inFlight) return;
      inFlight = true;
      try {
        const res = await fetch("/api/admin/mapa", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const next: MapSnapshot = await res.json();
        if (cancelled) return;
        setSnapshot((current) => (next.generatedAt >= current.generatedAt ? next : current));
        setUpdatedAt(Date.now());
      } catch {
        /* reintenta en el siguiente ciclo */
      } finally {
        inFlight = false;
      }
    }

    const timer = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [live]);

  // "Actualizado hace…" se refresca solo
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 5_000);
    return () => clearInterval(timer);
  }, []);

  // Booths para el canvas, leidos en cada cuadro sin reiniciar la animacion.
  const boothsRef = useRef<{ id: string; spot: Point; emoji: string; active: boolean }[]>([]);
  boothsRef.current = snapshot.stations.map((station) => ({
    id: station.id,
    spot: spots.get(station.id)!,
    emoji: station.emoji,
    active: station.active,
  }));

  // Animacion
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      dprRef.current = dpr;
      size.current = { w, h };
      cam.current = touchedCamera.current ? clampCamera(cam.current, w, h) : defaultCamera(w, h);
      setZoomState(zoomStateOf(cam.current.zoom));
      applyView();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);

    // Pasar la ventana a otra pantalla (laptop -> proyector) cambia la
    // densidad de pixeles sin cambiar el tamaño: tambien hay que medir.
    let dprQuery: MediaQueryList | null = null;
    const watchDpr = () => {
      dprQuery?.removeEventListener("change", onDprChange);
      dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      dprQuery.addEventListener("change", onDprChange);
    };
    const onDprChange = () => {
      resize();
      watchDpr();
    };
    watchDpr();

    let raf = 0;
    let last = performance.now();
    const frame = (nowMs: number) => {
      const dt = Math.min(0.1, (nowMs - last) / 1000);
      last = nowMs;
      const t = nowMs / 1000;
      step(sprites.current, dt);

      const { w, h } = size.current;
      const dpr = dprRef.current;
      const view = viewRect(cam.current, w, h);
      const k = view.scale * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(k, 0, 0, k, -view.x * k, -view.y * k);

      // Gente, kioskos y mesa de premios ordenados de atras hacia adelante.
      type Item = { d: number; draw: () => void };
      const items: Item[] = [];
      for (const booth of boothsRef.current) {
        const age = t - (pulses.current.get(booth.id) ?? -10);
        items.push({ d: depth(booth.spot), draw: () => drawBooth(ctx, booth, age) });
      }
      const deskAge = t - (pulses.current.get("desk") ?? -10);
      items.push({ d: depth(DESK), draw: () => drawPrizeDesk(ctx, deskAge) });
      for (const sprite of sprites.current.values()) {
        items.push({ d: depth(sprite), draw: () => drawSprite(ctx, sprite, t, sprite.id === selectedId.current) });
      }
      items.sort((a, b) => a.d - b.d);
      for (const item of items) item.draw();

      effects.current = effects.current.filter((fx) => drawFx(ctx, fx, t, view));

      // La tarjeta sigue a su personaje mientras camina.
      const card = cardRef.current;
      const chosen = selectedId.current ? sprites.current.get(selectedId.current) : undefined;
      if (card && chosen) {
        const head = toScreen(cam.current, w, h, project(chosen, 46));
        const x = Math.min(w - 8, Math.max(8, head.x));
        const y = Math.max(8, head.y);
        card.style.transform = `translate(${x}px, ${y}px)`;
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      dprQuery?.removeEventListener("change", onDprChange);
    };
  }, [applyView]);

  /** La persona mas cercana a un pixel del cuadro, si hay alguien cerca. */
  const pick = useCallback((px: number, py: number, radius: number): Sprite | null => {
    const { w, h } = size.current;
    let best: Sprite | null = null;
    let bestDist = radius;
    for (const sprite of sprites.current.values()) {
      // Se mide al torso, no a los pies.
      const torso = toScreen(cam.current, w, h, project(sprite, 20));
      const d = Math.hypot(torso.x - px, torso.y - py);
      if (d < bestDist) {
        best = sprite;
        bestDist = d;
      }
    }
    return best;
  }, []);

  const select = useCallback((next: Selection | null) => {
    selectedId.current = next?.id ?? null;
    setSelection(next);
  }, []);

  // Gestos: arrastrar para mover, pellizcar para acercar, tocar para ver a alguien.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ moved: 0, pinchDist: 0 });

  const local = (event: React.PointerEvent | PointerEvent | WheelEvent) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  /** Si quedan dos dedos, el pellizco sigue desde su distancia actual (sin saltos). */
  const resetPinch = () => {
    if (pointers.current.size < 2) return;
    const [a, b] = [...pointers.current.values()];
    gesture.current.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    // Clic derecho o con Ctrl en Mac: abre el menu y nunca llega el pointerup.
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, local(event));
    if (pointers.current.size === 1) gesture.current.moved = 0;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      gesture.current.moved = DRAG_PX + 1;
    }
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const p = local(event);
      const { w, h } = size.current;
      // Un mouse sin botones apretados ya no esta arrastrando.
      if (event.pointerType === "mouse" && event.buttons === 0) pointers.current.delete(event.pointerId);
      const prev = pointers.current.get(event.pointerId);

      if (!prev) {
        // Mouse sin apretar: solo se asoma la tarjeta.
        if (event.pointerType === "mouse" && !selection?.pinned) {
          const hit = pick(p.x, p.y, PICK_PX.mouse);
          if ((hit?.id ?? null) !== selectedId.current) select(hit ? { id: hit.id, pinned: false } : null);
        }
        return;
      }

      if (pointers.current.size >= 2) {
        const before = [...pointers.current.values()];
        const midBefore = { x: (before[0].x + before[1].x) / 2, y: (before[0].y + before[1].y) / 2 };
        pointers.current.set(event.pointerId, p);
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const factor = gesture.current.pinchDist > 0 ? dist / gesture.current.pinchDist : 1;
        gesture.current.pinchDist = dist;
        const zoomed = zoomAt(cam.current, w, h, factor, mid.x, mid.y);
        setCamera(panBy(zoomed, w, h, mid.x - midBefore.x, mid.y - midBefore.y));
        return;
      }

      pointers.current.set(event.pointerId, p);
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      gesture.current.moved += Math.hypot(dx, dy);
      if (gesture.current.moved > DRAG_PX) setCamera(panBy(cam.current, w, h, dx, dy));
    },
    [pick, select, selection?.pinned, setCamera],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const p = local(event);
      const wasTap = pointers.current.size === 1 && gesture.current.moved <= DRAG_PX;
      pointers.current.delete(event.pointerId);
      if (pointers.current.size === 1) gesture.current.moved = DRAG_PX + 1;
      resetPinch();
      if (!wasTap) return;
      const hit = pick(p.x, p.y, event.pointerType === "mouse" ? PICK_PX.mouse : PICK_PX.touch);
      select(hit ? { id: hit.id, pinned: true } : null);
    },
    [pick, select],
  );

  const onPointerCancel = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId);
    resetPinch();
  }, []);

  const onPointerLeave = useCallback(() => {
    if (pointers.current.size === 0 && !selection?.pinned) select(null);
  }, [select, selection?.pinned]);

  // Ctrl/⌘ + rueda (y el pellizco del trackpad) acercan; la rueda sola baja la pagina.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const p = local(event);
      const { w, h } = size.current;
      setCamera(zoomAt(cam.current, w, h, Math.exp(-event.deltaY * 0.01), p.x, p.y));
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [setCamera]);

  function zoomBy(factor: number) {
    const { w, h } = size.current;
    setCamera(zoomAt(cam.current, w, h, factor, w / 2, h / 2));
  }

  function resetCamera() {
    const { w, h } = size.current;
    setCamera(clampCamera({ cx: 800, cy: 480, zoom: 1 }, w, h));
  }

  function toggleFullscreen() {
    const frame = frameRef.current;
    if (!frame) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frame.requestFullscreen?.();
  }

  const inStation = new Map<string, number>();
  let waitingPrize = 0;
  const byProfile = new Map<string, number>();
  for (const person of snapshot.people) {
    if (person.status === "leaving") continue;
    if (person.status === "prize") waitingPrize += 1;
    else inStation.set(person.stationId, (inStation.get(person.stationId) ?? 0) + 1);
    byProfile.set(person.profile, (byProfile.get(person.profile) ?? 0) + 1);
  }
  const onSite = [...byProfile.values()].reduce((a, b) => a + b, 0);

  const booths: BoothInfo[] = snapshot.stations.map((station) => ({
    ...station,
    spot: spots.get(station.id)!,
    count: inStation.get(station.id) ?? 0,
  }));

  const chosen = selection ? sprites.current.get(selection.id) : undefined;
  // Lugar inicial de la tarjeta; despues la mueve la animacion.
  const cardAt =
    chosen && size.current.w
      ? toScreen(cam.current, size.current.w, size.current.h, project(chosen, 46))
      : { x: 0, y: 0 };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Mapa en vivo</h1>
          <p className="mt-1 text-sm text-white/55">
            Cada quien está en la estación de su último escaneo
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 text-xs text-white/55 sm:w-auto">
          <span className="mr-auto flex items-center gap-2 pr-1">
            <span className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-success" : "bg-white/30"}`} />
            Actualizado {relativeTime(new Date(updatedAt))}
          </span>
          <button
            type="button"
            onClick={() => setLive((value) => !value)}
            className="btn btn-ghost min-h-11 px-3 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-gold"
          >
            {live ? "Pausar" : "Reanudar"}
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="btn btn-ghost min-h-11 px-3 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-gold"
          >
            Pantalla completa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile index={0} label="En el recinto" value={onSite} accent="#9fd0ff" />
        <StatTile index={1} label="Esperando premio" value={waitingPrize} accent="#f5b301" />
        <StatTile index={2} label="Completaron" value={snapshot.totals.completed} accent="#ff8a65" />
        <StatTile index={3} label="Premios entregados" value={snapshot.totals.redeemed} accent="#23c77f" />
      </div>

      <div ref={frameRef} className="rounded-2xl bg-[#061529] [&:fullscreen]:flex [&:fullscreen]:p-3">
        <div
          ref={stageRef}
          className="relative aspect-square max-h-[75dvh] w-full overflow-hidden rounded-2xl border border-white/10 sm:aspect-[5/3] [:fullscreen_&]:aspect-auto [:fullscreen_&]:h-full [:fullscreen_&]:max-h-none"
        >
          <VenueArt ref={artRef} />
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 h-full w-full touch-none ${zoomState !== "fit" ? "cursor-grab active:cursor-grabbing" : ""}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onLostPointerCapture={onPointerCancel}
            onPointerLeave={onPointerLeave}
          />
          <VenueLabels ref={labelsRef} booths={booths} prizeCount={waitingPrize} />

          {chosen && selection && (
            <div
              ref={cardRef}
              className="pointer-events-none absolute left-0 top-0 z-10 will-change-transform"
              style={{ transform: `translate(${cardAt.x}px, ${cardAt.y}px)` }}
            >
              <div className="map-tile-in -translate-x-1/2 -translate-y-full pb-2">
                <div className="w-max max-w-60 rounded-xl border border-white/15 bg-[#0b1f3a]/95 px-3 py-2 text-xs shadow-xl">
                  <p className="font-semibold text-white [overflow-wrap:anywhere]">{chosen.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-white/70">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: chosen.color }} />
                    {chosen.profile}
                  </p>
                  <p className="mt-0.5 text-white/50">{placeLabel(chosen, snapshot.stations)}</p>
                </div>
              </div>
            </div>
          )}

          {snapshot.people.length === 0 && (
            <p className="pointer-events-none absolute inset-x-4 bottom-[8%] text-center text-sm font-semibold text-white/80">
              Aún nadie ha escaneado: los personajes aparecen con su primer escaneo.
            </p>
          )}

          <div className="absolute right-2 top-2 flex gap-2 sm:right-3 sm:top-3">
            <button type="button" aria-label="Acercar" className={MAP_BUTTON} disabled={zoomState === "max"} onClick={() => zoomBy(1.4)}>
              +
            </button>
            <button type="button" aria-label="Alejar" className={MAP_BUTTON} disabled={zoomState === "fit"} onClick={() => zoomBy(1 / 1.4)}>
              −
            </button>
            <button type="button" aria-label="Ver todo el recinto" className={`${MAP_BUTTON} text-sm`} disabled={zoomState === "fit"} onClick={resetCamera}>
              ⤢
            </button>
          </div>
        </div>
      </div>
      <p className="text-xs text-white/40">
        Arrastra para moverte · pellizca o Ctrl + rueda para acercar · toca a alguien para ver quién es.
      </p>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
          Perfiles en el recinto
        </h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {PROFILES.map((profile) => (
            <li
              key={profile}
              className={`flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 ${byProfile.get(profile) ? "text-white/85" : "text-white/30"}`}
            >
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: profileColor(profile) }} />
              {profileLabel(profile)}
              <span className="tabular-nums text-white/45">{byProfile.get(profile) ?? 0}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-white/40">
          Casco blanco: arquitectos e inspectores · birrete: estudiantes · estrella dorada: completó
          el recorrido y espera su premio. Al recoger el premio camina a la salida y desaparece.
        </p>
      </section>
    </div>
  );
}
