"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VenueArt, { VenueLabels, type BoothInfo } from "@/components/map/VenueArt";
import { applySnapshot, drawSprite, step, type Sprite } from "@/components/map/sprites";
import type { MapSnapshot } from "@/lib/map";
import { stationSpots, VIEW } from "@/lib/map-layout";
import { PROFILES, profileColor, profileLabel } from "@/lib/profiles";
import { relativeTime } from "@/lib/format";

const POLL_MS = 5_000;
/** Que tan cerca (en unidades del lienzo) hay que pasar el mouse de alguien. */
const HOVER_RADIUS = 20;

type Hover = { id: string; left: number; top: number };

function placeLabel(sprite: Sprite, stations: MapSnapshot["stations"]): string {
  if (sprite.status === "leaving") return "Ya recogió su premio · saliendo";
  if (sprite.status === "prize") return "Completó el recorrido · esperando premio";
  const station = stations.find((s) => s.id === sprite.stationId);
  return station ? `Último escaneo: ${station.emoji} ${station.name}` : "En el recinto";
}

/**
 * Mapa en vivo del Fronton Bucareli: cada asistente que ya escaneo es un
 * personaje del color de su perfil, parado en la estacion de su ultimo
 * escaneo. Los cambios llegan por sondeo y los personajes caminan entre
 * estaciones, a la mesa de premios y a la salida.
 */
export default function LiveMap({ initial }: { initial: MapSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [live, setLive] = useState(true);
  const [hover, setHover] = useState<Hover | null>(null);
  const [, setTick] = useState(0);

  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sprites = useRef(new Map<string, Sprite>());
  const firstApply = useRef(true);
  const hoverId = useRef<string | null>(null);

  const spots = useMemo(() => stationSpots(snapshot.stations.map((s) => s.id)), [snapshot.stations]);

  // Cada sondeo mueve a los personajes hacia su nuevo lugar.
  useEffect(() => {
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    applySnapshot(sprites.current, snapshot.people, spots, {
      initial: firstApply.current,
      instant,
    });
    firstApply.current = false;
  }, [snapshot, spots]);

  // Sondeo
  useEffect(() => {
    if (!live) return;
    let cancelled = false;

    async function refresh() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/admin/mapa", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        setSnapshot(await res.json());
        setUpdatedAt(Date.now());
      } catch {
        /* reintenta en el siguiente ciclo */
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

  // Animacion
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let scale = 1;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      scale = (width / VIEW.width) * dpr;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      step(sprites.current, dt);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      // Los de abajo se dibujan al final para que tapen a los de atras.
      const ordered = [...sprites.current.values()].sort((a, b) => a.y - b.y);
      const t = now / 1000;
      for (const sprite of ordered) drawSprite(ctx, sprite, t, sprite.id === hoverId.current);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const k = VIEW.width / rect.width;
    const ux = (event.clientX - rect.left) * k;
    const uy = (event.clientY - rect.top) * k;

    let best: Sprite | null = null;
    let bestDist = HOVER_RADIUS;
    for (const sprite of sprites.current.values()) {
      // Se mide al torso, no a los pies.
      const d = Math.hypot(sprite.x - ux, sprite.y - 18 - uy);
      if (d < bestDist) {
        best = sprite;
        bestDist = d;
      }
    }

    hoverId.current = best?.id ?? null;
    setHover(
      best
        ? {
            id: best.id,
            // Que la tarjeta no se salga por los lados del mapa.
            left: Math.min(rect.width - 130, Math.max(130, event.clientX - rect.left)),
            top: Math.max(90, event.clientY - rect.top),
          }
        : null,
    );
  }, []);

  const onPointerLeave = useCallback(() => {
    hoverId.current = null;
    setHover(null);
  }, []);

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

  const hovered = hover ? sprites.current.get(hover.id) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mapa en vivo</h1>
          <p className="mt-1 text-sm text-white/55">
            {onSite} {onSite === 1 ? "persona" : "personas"} en el recinto · cada quien está en la
            estación de su último escaneo
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/50">
          <span className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-success" : "bg-white/30"}`}
            />
            Actualizado {relativeTime(new Date(updatedAt))}
          </span>
          <button
            type="button"
            onClick={() => setLive((value) => !value)}
            className="underline underline-offset-4"
          >
            {live ? "Pausar" : "Reanudar"}
          </button>
          <button type="button" onClick={toggleFullscreen} className="btn btn-ghost px-3 py-1.5 text-xs">
            Pantalla completa
          </button>
        </div>
      </div>

      <div
        ref={frameRef}
        className="flex items-center justify-center rounded-2xl bg-navy [&:fullscreen]:p-4"
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10">
          <VenueArt booths={booths} />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          />
          <VenueLabels booths={booths} prizeCount={waitingPrize} />
          {hovered && hover && (
            <div
              className="pointer-events-none absolute z-10 w-max max-w-64 -translate-x-1/2 -translate-y-full rounded-lg border border-white/15 bg-navy/95 px-3 py-2 text-xs shadow-lg"
              style={{ left: hover.left, top: hover.top - 14 }}
            >
              <p className="font-semibold text-white">{hovered.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-white/70">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: hovered.color }}
                />
                {hovered.profile}
              </p>
              <p className="mt-0.5 text-white/50">{placeLabel(hovered, snapshot.stations)}</p>
            </div>
          )}
          {snapshot.people.length === 0 && (
            <p className="pointer-events-none absolute inset-x-0 bottom-[8%] text-center text-sm font-semibold text-white/80">
              Aún nadie ha escaneado: los personajes aparecen con su primer escaneo.
            </p>
          )}
        </div>
      </div>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
          Perfiles en el recinto
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {PROFILES.map((profile) => (
            <li
              key={profile}
              className={`flex items-center gap-2 ${byProfile.get(profile) ? "text-white/80" : "text-white/30"}`}
            >
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: profileColor(profile) }}
              />
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
