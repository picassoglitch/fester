"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FesterLogo from "@/components/FesterLogo";
import { drawWinner, voidWinner, type RaffleWinnerView } from "@/app/actions/raffle";

type WinnerRow = RaffleWinnerView & { voided: boolean };
type Phase = "idle" | "spinning" | "revealed";

/** Duracion del carrete; se frena poco a poco hasta el ganador. */
export const SPIN_MS = 4200;
const CONFETTI_MS = 6000;
const BRAND = ["#e2001a", "#ffffff", "#f5b301", "#9fd0ff", "#1e6fc0"];

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/* ------------------------------- sonido ------------------------------- */

let audio: AudioContext | null = null;
function ctx(): AudioContext | null {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    return audio;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, length: number, gain = 0.18, type: OscillatorType = "triangle") {
  const ac = ctx();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.setValueAtTime(0.0001, t0);
  vol.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  vol.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  osc.connect(vol).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + length + 0.05);
}

const tick = () => tone(1400, 0, 0.04, 0.05, "square");

function fanfare() {
  // Arpegio de trompeta: Do-Mi-Sol-Do, y el acorde final sostenido.
  const notes: [number, number, number][] = [
    [523.25, 0, 0.18],
    [659.25, 0.16, 0.18],
    [783.99, 0.32, 0.18],
    [1046.5, 0.5, 0.9],
    [783.99, 0.5, 0.9],
    [659.25, 0.5, 0.9],
  ];
  for (const [f, s, l] of notes) tone(f, s, l, 0.16, "sawtooth");
}

/* ------------------------------ confeti ------------------------------- */

type Piece = { x: number; y: number; vx: number; vy: number; r: number; spin: number; w: number; h: number; color: string };

function launchConfetti(canvas: HTMLCanvasElement): () => void {
  const g = canvas.getContext("2d");
  if (!g) return () => {};
  const dpr = window.devicePixelRatio || 1;
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  g.scale(dpr, dpr);

  const pieces: Piece[] = [];
  const burst = (x: number, y: number, n: number, dir: number) => {
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + dir * (Math.random() * 0.9) + (Math.random() - 0.5) * 0.6;
      const speed = 9 + Math.random() * 11;
      pieces.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.4,
        w: 8 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        color: BRAND[i % BRAND.length],
      });
    }
  };
  burst(0, height, 160, 1);
  burst(width, height, 160, -1);
  for (let i = 0; i < 140; i++) burst(Math.random() * width, -20, 1, 0);

  const start = performance.now();
  let frame = 0;
  const step = (now: number) => {
    const elapsed = now - start;
    g.clearRect(0, 0, width, height);
    for (const p of pieces) {
      p.vy += 0.35;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.spin;
      g.save();
      g.globalAlpha = Math.max(0, 1 - elapsed / CONFETTI_MS);
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.fillStyle = p.color;
      g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
      g.restore();
    }
    if (elapsed < CONFETTI_MS) frame = requestAnimationFrame(step);
    else g.clearRect(0, 0, width, height);
  };
  frame = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(frame);
    g.clearRect(0, 0, width, height);
  };
}

/* ------------------------------- escena ------------------------------- */

export default function RaffleStage({
  pool,
  reel,
  winners,
}: {
  pool: number;
  reel: string[];
  winners: WinnerRow[];
}) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const busy = useRef(false);
  const stopConfetti = useRef<() => void>(() => {});
  const [phase, setPhase] = useState<Phase>("idle");
  const [shown, setShown] = useState<string>("");
  const [winner, setWinner] = useState<RaffleWinnerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => () => stopConfetti.current(), []);

  const draw = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    stopConfetti.current();
    setError(null);
    setWinner(null);
    setPhase("spinning");

    const names = reel.length > 0 ? reel : ["…"];
    const calm = reducedMotion();
    // Sin respuesta no sabemos si quedo registrado: se pide revisar la lista antes de repetir.
    const result = drawWinner().catch(() => ({
      ok: false as const,
      error: "Se perdió la conexión. Revisa la lista de ganadores antes de volver a sortear.",
    }));

    // Carrete: cada nombre dura un poco mas que el anterior (frenado cuadratico).
    if (!calm) {
      const started = performance.now();
      let i = Math.floor(Math.random() * names.length);
      await new Promise<void>((resolve) => {
        const next = () => {
          const t = (performance.now() - started) / SPIN_MS;
          if (t >= 1) return resolve();
          setShown(names[i++ % names.length]);
          tick();
          setTimeout(next, 45 + 380 * t * t);
        };
        next();
      });
    }

    const outcome = await result;
    if (!outcome.ok) {
      setError(outcome.error);
      setPhase("idle");
      busy.current = false;
      router.refresh();
      return;
    }
    setWinner(outcome.winner);
    setShown(outcome.winner.name);
    setPhase("revealed");
    fanfare();
    if (!calm && canvasRef.current) stopConfetti.current = launchConfetti(canvasRef.current);
    busy.current = false;
    router.refresh();
  }, [reel, router]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select")) return;
      event.preventDefault();
      void draw();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draw]);

  async function voidCurrent(id: string) {
    setError(null);
    setVoiding(true);
    try {
      const res = await voidWinner(id).catch(() => null);
      if (!res?.ok) {
        setError("No se pudo anular. Recarga la página y revisa la lista de ganadores.");
        router.refresh();
        return;
      }
      if (winner?.id === id) {
        stopConfetti.current();
        setWinner(null);
        setPhase("idle");
      }
      router.refresh();
    } finally {
      setVoiding(false);
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen?.();
  }

  const valid = winners.filter((w) => !w.voided);

  return (
    <div
      ref={stageRef}
      className="relative isolate flex min-h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-2xl bg-[radial-gradient(60rem_35rem_at_50%_-10%,rgba(255,255,255,0.14),transparent_65%),radial-gradient(45rem_30rem_at_100%_100%,rgba(226,0,26,0.28),transparent_60%),linear-gradient(180deg,#00559c_0%,#004f92_45%,#002a52_100%)] p-[clamp(1rem,2.5vw,3rem)] data-[fs=true]:min-h-dvh data-[fs=true]:rounded-none"
      data-fs={fullscreen}
    >
      <div aria-hidden className="blueprint pointer-events-none absolute inset-0 -z-10 opacity-60" />
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full" />

      <header className="flex items-center gap-4">
        <FesterLogo className="h-[clamp(2rem,4vw,4.5rem)]" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[clamp(1.4rem,3vw,3.2rem)] font-bold uppercase leading-none tracking-wide">
            Rifa Encuentro Fester 2026
          </p>
          <p className="mt-1 text-[clamp(0.8rem,1.2vw,1.25rem)] text-white/70">
            {pool.toLocaleString("es-MX")} participantes con pasaporte completo
          </p>
        </div>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-lg border border-white/25 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
        >
          {fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        </button>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-[clamp(1rem,3vh,2.5rem)] py-8 text-center">
        {phase === "idle" && (
          <>
            <p className="font-display text-[clamp(2rem,6vw,7rem)] font-black uppercase leading-none">
              ¿Quién se lo lleva?
            </p>
          </>
        )}

        {/* Fuera de "idle": un anular fallido se ve aunque el ganador siga en pantalla. */}
        {error && phase !== "spinning" && (
          <p role="alert" className="rounded-xl bg-brand px-6 py-3 text-xl font-semibold">
            {error}
          </p>
        )}

        {phase === "spinning" && (
          <div className="w-full max-w-6xl rounded-3xl border-4 border-white/80 bg-navy/70 px-6 py-[clamp(1.5rem,5vh,4rem)] shadow-[0_0_80px_rgba(226,0,26,0.45)]">
            <p
              aria-live="off"
              className="truncate font-display text-[clamp(2.2rem,6.5vw,8rem)] font-black uppercase leading-none"
            >
              {shown || "…"}
            </p>
          </div>
        )}

        {phase === "revealed" && winner && (
          <div className="animate-scan-in flex flex-col items-center gap-[clamp(0.5rem,2vh,1.5rem)]">
            <p className="rounded-full bg-gold px-6 py-1.5 font-display text-[clamp(1.1rem,2.2vw,2.4rem)] font-black uppercase tracking-widest text-navy">
              ¡Ganador!
            </p>
            <p
              aria-live="assertive"
              className="max-w-[90vw] font-display text-[clamp(2.6rem,8vw,10rem)] font-black uppercase leading-[0.95] drop-shadow-[0_6px_0_rgba(226,0,26,0.9)]"
            >
              {winner.name}
            </p>
            {(winner.company || winner.state) && (
              <p className="text-[clamp(1.1rem,2.4vw,2.6rem)] font-semibold text-white/85">
                {[winner.company, winner.state].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="font-mono text-[clamp(0.9rem,1.4vw,1.5rem)] tracking-[0.35em] text-white/60">
              {winner.code}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => void draw()}
            disabled={phase === "spinning" || pool === 0}
            className="rounded-2xl bg-brand px-[clamp(2rem,5vw,5rem)] py-[clamp(0.9rem,2.2vh,1.6rem)] font-display text-[clamp(1.6rem,3.2vw,3.6rem)] font-black uppercase tracking-wider text-white shadow-[0_10px_0_#a80014] transition active:translate-y-1 active:shadow-[0_5px_0_#a80014] disabled:opacity-50"
          >
            {phase === "revealed" ? "Sortear otro" : phase === "spinning" ? "Sorteando…" : "Sortear"}
          </button>
          {phase === "revealed" && winner && (
            <button
              type="button"
              onClick={() => void voidCurrent(winner.id)}
              disabled={voiding}
              className="rounded-2xl border-2 border-white/70 px-6 py-3 text-[clamp(1rem,1.6vw,1.6rem)] font-bold hover:bg-white/10 disabled:opacity-50"
            >
              Anular (no está)
            </button>
          )}
        </div>
        {pool === 0 && phase !== "spinning" && (
          <p className="text-white/70">No quedan participantes por sortear.</p>
        )}
      </section>

      {winners.length > 0 && (
        <footer className="border-t border-white/15 pt-4">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-white/60">
            Ganadores ({valid.length})
          </p>
          <ol className="flex flex-wrap gap-2">
            {winners.map((w) => (
              <li
                key={w.id}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-[clamp(0.85rem,1.1vw,1.15rem)] ${
                  w.voided ? "bg-white/5 text-white/40 line-through" : "bg-white/12 font-semibold"
                }`}
              >
                <span>{w.name}</span>
                {!w.voided && !fullscreen && (
                  <button
                    type="button"
                    onClick={() => void voidCurrent(w.id)}
                    disabled={voiding}
                    className="text-xs font-normal text-white/60 underline underline-offset-2"
                    aria-label={`Anular a ${w.name}`}
                  >
                    anular
                  </button>
                )}
              </li>
            ))}
          </ol>
        </footer>
      )}
    </div>
  );
}
