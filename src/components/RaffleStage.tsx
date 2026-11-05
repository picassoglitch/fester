"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FesterLogo from "@/components/FesterLogo";
import { drawWinner, resetRaffle, voidWinner, type RaffleWinnerView } from "@/app/actions/raffle";
import { PrizeImage, SlotDots } from "@/components/RafflePrizeCard";
import {
  RAFFLE_CATEGORIES,
  RAFFLE_PRIZES,
  categoryPlural,
  emptyPoolMessage,
  fullPrizeMessage,
  prizeTitle,
  rafflePrize,
  type RaffleCategory,
  type RafflePrize,
} from "@/lib/raffle-prizes";

type WinnerRow = RaffleWinnerView & { voided: boolean };
type Phase = "idle" | "spinning" | "revealed";

/** Mosaico de participantes que se proyecta mientras se elimina al azar. */
const WALL = 36;
const FINALISTS = 3;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Tile = { name: string; out: boolean; hot: boolean };
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
  // El sonido nunca debe trabar un sorteo que el servidor ya registro.
  try {
    playTone(freq, start, length, gain, type);
  } catch {}
}

function playTone(freq: number, start: number, length: number, gain: number, type: OscillatorType) {
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

// Color del brazalete de cada categoria (ROJO aplicador, AZUL profesionista).
const CATEGORY_CHIP: Record<RaffleCategory, string> = {
  Aplicador: "bg-brand text-white",
  Profesionista: "bg-sky text-navy",
};

function firstOpen(filled: Record<string, number>): RafflePrize {
  return RAFFLE_PRIZES.find((p) => (filled[p.key] ?? 0) < p.slots) ?? RAFFLE_PRIZES[0];
}

export default function RaffleStage({
  pools,
  pending,
  reels,
  filled: filledProp,
  winners,
}: {
  pools: Record<RaffleCategory, number>;
  pending: Record<RaffleCategory, number>;
  reels: Record<RaffleCategory, string[]>;
  filled: Record<string, number>;
  winners: WinnerRow[];
}) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const busy = useRef(false);
  const stopConfetti = useRef<() => void>(() => {});
  const [phase, setPhase] = useState<Phase>("idle");
  const [prizeKey, setPrizeKey] = useState<string>(() => firstOpen(filledProp).key);
  // El lugar recien ganado cuenta ya, sin esperar a que router.refresh() traiga el conteo nuevo.
  const [justWon, setJustWon] = useState<{ key: string; atLeast: number } | null>(null);
  const filled = justWon
    ? { ...filledProp, [justWon.key]: Math.max(filledProp[justWon.key] ?? 0, justWon.atLeast) }
    : filledProp;
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [left, setLeft] = useState(0);
  const [stage, setStage] = useState("");
  const [winner, setWinner] = useState<RaffleWinnerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const prize = rafflePrize(prizeKey) ?? RAFFLE_PRIZES[0];
  const pool = pools[prize.category];
  const reel = reels[prize.category];
  const taken = filled[prize.key] ?? 0;
  const full = taken >= prize.slots;

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => () => stopConfetti.current(), []);

  function choose(key: string) {
    if (busy.current) return;
    stopConfetti.current();
    setError(null);
    setWinner(null);
    setPhase("idle");
    setPrizeKey(key);
  }

  // El ganador ya lo eligio el servidor (azar criptografico); esto solo lo muestra en pantalla.
  const playWall = useCallback(
    async (winnerName: string) => {
      const others = shuffled(reel.filter((n) => n !== winnerName)).slice(0, WALL - 1);
      const winnerAt = Math.floor(Math.random() * (others.length + 1));
      const names = [...others.slice(0, winnerAt), winnerName, ...others.slice(winnerAt)];
      const total = names.length;
      setTiles(names.map((name) => ({ name, out: false, hot: false })));
      setStage("Eliminando al azar · quedan");

      const order = shuffled(names.map((_, i) => i).filter((i) => i !== winnerAt));
      const knockouts = order.slice(0, Math.max(0, total - FINALISTS));
      const finalists = [winnerAt, ...order.slice(knockouts.length)];
      const gone = new Set<number>();
      for (let k = 0; k < knockouts.length; k++) {
        gone.add(knockouts[k]);
        const remaining = total - gone.size;
        setTiles((prev) => prev.map((t, i) => ({ ...t, out: gone.has(i), hot: i === knockouts[k] })));
        // El contador baja del total real de participantes a los finalistas.
        setLeft(Math.max(FINALISTS, Math.round((pool * remaining) / total)));
        tick();
        const t = k / knockouts.length;
        await wait(170 - 120 * Math.sin(Math.PI * t));
      }

      setStage(`¡${finalists.length} finalistas!`);
      setLeft(finalists.length);
      await wait(900);
      if (finalists.length > 1) {
        const hops = 14;
        let at = 0;
        for (let h = 0; h < hops; h++) {
          at = h === hops - 1 ? 0 : (at + 1 + Math.floor(Math.random() * (finalists.length - 1))) % finalists.length;
          const spot = finalists[at];
          setTiles((prev) => prev.map((t, i) => ({ ...t, hot: i === spot })));
          tone(600 + h * 40, 0, 0.08, 0.08, "square");
          await wait(90 + 45 * h);
        }
      }
      setTiles((prev) => prev.map((t, i) => ({ ...t, out: i !== winnerAt, hot: i === winnerAt })));
      setLeft(1);
      await wait(1100);
    },
    [reel, pool],
  );

  const draw = useCallback(async () => {
    if (busy.current || full || pool === 0) return;
    busy.current = true;
    stopConfetti.current();
    setError(null);
    setWinner(null);
    setResetOpen(false);
    setResetDone(false);
    setPhase("spinning");

    const calm = reducedMotion();
    setLeft(pool);
    setStage("Mezclando participantes…");
    setTiles(shuffled(reel).slice(0, WALL).map((name) => ({ name, out: false, hot: false })));
    // Sin respuesta no sabemos si quedo registrado: se pide revisar la lista antes de repetir.
    const result = drawWinner(prize.key).catch(() => ({
      ok: false as const,
      error: "Se perdió la conexión. Revisa la lista de ganadores antes de volver a sortear.",
    }));

    // Mientras responde el servidor, los nombres se revuelven en el mosaico.
    let mixing = true;
    const mix = (async () => {
      while (mixing) {
        setTiles((prev) => {
          const names = shuffled(prev.map((t) => t.name));
          return prev.map((t, i) => ({ ...t, name: names[i], hot: Math.random() < 0.12 }));
        });
        tick();
        await wait(90);
      }
    })();
    const outcome = await result;
    await wait(calm || !outcome.ok ? 0 : 1600);
    mixing = false;
    await mix;

    // Si la animacion falla, el ganador ya registrado se revela igual.
    if (outcome.ok && !calm) await playWall(outcome.winner.name).catch(() => {});

    if (!outcome.ok) {
      setError(outcome.error);
      setPhase("idle");
      busy.current = false;
      router.refresh();
      return;
    }
    setJustWon({ key: prize.key, atLeast: taken + 1 });
    setWinner(outcome.winner);
    setPhase("revealed");
    fanfare();
    try {
      if (!calm && canvasRef.current) stopConfetti.current = launchConfetti(canvasRef.current);
    } catch {}
    busy.current = false;
    router.refresh();
  }, [reel, pool, full, taken, prize.key, router, playWall]);

  // Lleno el premio, el boton avanza al siguiente con lugares libres.
  const next = RAFFLE_PRIZES.find((p) => p.key !== prize.key && (filled[p.key] ?? 0) < p.slots) ?? null;
  const primary = useCallback(() => {
    if (phase === "revealed" && full) {
      if (next) choose(next.key);
      return;
    }
    void draw();
  }, [phase, full, next, draw]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select")) return;
      event.preventDefault();
      primary();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [primary]);

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
      setJustWon(null);
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

  async function confirmReset() {
    if (busy.current) return;
    // Con el candado tomado, Espacio/Enter no arrancan un sorteo a mitad del reinicio.
    busy.current = true;
    setError(null);
    setResetting(true);
    try {
      const res = await resetRaffle().catch(() => null);
      if (!res) {
        setError("No se pudo reiniciar la dinámica. Recarga la página e intenta de nuevo.");
        return;
      }
      stopConfetti.current();
      setJustWon(null);
      setWinner(null);
      setPhase("idle");
      setPrizeKey(RAFFLE_PRIZES[0].key);
      setResetOpen(false);
      setResetDone(true);
    } finally {
      busy.current = false;
      setResetting(false);
      router.refresh();
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen?.();
  }

  const valid = winners.filter((w) => !w.voided);
  const totalPool = RAFFLE_CATEGORIES.reduce((n, c) => n + pools[c], 0);
  const won = winner ? (rafflePrize(winner.prizeKey) ?? prize) : prize;
  const blocked = full ? fullPrizeMessage(prize) : pool === 0 ? emptyPoolMessage(prize) : null;
  const buttonLabel =
    phase === "spinning"
      ? "Sorteando…"
      : phase === "revealed" && full
        ? next
          ? "Siguiente premio"
          : "Dinámica completa"
        : full
          ? "Premio completo"
          : phase === "revealed"
            ? "Sortear otro lugar"
            : "Sortear";
  const buttonDisabled =
    phase === "spinning" || (phase === "revealed" && full ? !next : full || pool === 0);

  return (
    <div
      ref={stageRef}
      className="relative isolate flex min-h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-2xl bg-[radial-gradient(60rem_35rem_at_50%_-10%,rgba(255,255,255,0.14),transparent_65%),radial-gradient(45rem_30rem_at_100%_100%,rgba(226,0,26,0.28),transparent_60%),linear-gradient(180deg,#00559c_0%,#004f92_45%,#002a52_100%)] px-[clamp(1rem,2.5vw,3rem)] py-[clamp(0.75rem,2.2vh,2rem)] data-[fs=true]:min-h-dvh data-[fs=true]:overflow-y-auto data-[fs=true]:rounded-none"
      data-fs={fullscreen}
    >
      <div aria-hidden className="blueprint pointer-events-none absolute inset-0 -z-10 opacity-60" />
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-20 h-full w-full" />

      <header className="flex items-center gap-4">
        <FesterLogo className="h-[clamp(2rem,4vw,4.5rem)]" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[clamp(1.4rem,3vw,3.2rem)] font-bold uppercase leading-none tracking-wide">
            Dinámica Encuentro Fester 2026
          </p>
        </div>
        {!fullscreen && phase !== "spinning" && winners.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setResetDone(false);
              setResetOpen((open) => !open);
            }}
            aria-expanded={resetOpen}
            className="rounded-lg px-3 py-1.5 text-sm text-white/60 underline-offset-2 hover:underline"
          >
            Reiniciar dinámica
          </button>
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-lg border border-white/25 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
        >
          {fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        </button>
      </header>

      {!fullscreen && resetOpen && phase !== "spinning" && winners.length > 0 && (
        <div
          role="alertdialog"
          aria-label="Reiniciar dinámica"
          aria-describedby="reiniciar-aviso"
          onKeyDown={(event) => {
            if (event.key === "Escape") setResetOpen(false);
          }}
          className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-brand/70 bg-navy/80 px-4 py-3"
        >
          <p id="reiniciar-aviso" className="flex-1 text-base">
            Esto borra {winners.length.toLocaleString("es-MX")} {winners.length === 1 ? "ganador" : "ganadores"}
            {winners.length > valid.length ? " (anulados incluidos)" : ""} y todos vuelven a participar.
          </p>
          <button
            type="button"
            autoFocus
            onClick={() => setResetOpen(false)}
            disabled={resetting}
            className="rounded-lg border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirmReset()}
            disabled={resetting}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-[#a80014] disabled:opacity-50"
          >
            {resetting ? "Reiniciando…" : "Sí, reiniciar"}
          </button>
        </div>
      )}
      {!fullscreen && resetDone && winners.length === 0 && (
        <p role="status" className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-base font-semibold">
          Dinámica reiniciada: 0 ganadores
        </p>
      )}

      {/* Aldo 2026-11-05 — en pantalla completa (la que ve el público) no se muestran los conteos. */}
      {!fullscreen && (
        <dl
          aria-label="Participantes"
          className="mt-[clamp(0.6rem,1.6vh,1.25rem)] flex flex-wrap items-stretch gap-[clamp(0.4rem,0.8vw,0.8rem)]"
        >
          {RAFFLE_CATEGORIES.map((c) => (
            <div key={c} className="flex items-center gap-2.5 rounded-2xl bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
              <dt
                className={`rounded-full px-3 py-0.5 text-[clamp(0.7rem,0.9vw,0.95rem)] font-bold uppercase tracking-widest ${CATEGORY_CHIP[c]}`}
              >
                {categoryPlural(c)}
              </dt>
              <dd className="flex items-baseline gap-2">
                <span className="font-display text-[clamp(1.4rem,2.2vw,2.6rem)] font-black leading-none tabular-nums">
                  {pools[c].toLocaleString("es-MX")}
                </span>{" "}
                <span className="text-[clamp(0.85rem,1.1vw,1.2rem)] font-semibold text-white/85">participan</span>{" "}
                <span className="text-[clamp(0.75rem,0.95vw,1rem)] text-white/55">
                  · {pending[c].toLocaleString("es-MX")} llegaron sin completar pasaporte
                </span>
              </dd>
            </div>
          ))}
          <div className="flex items-center gap-2.5 rounded-2xl bg-gold px-3 py-1.5 text-navy">
            <dt className="text-[clamp(0.7rem,0.9vw,0.95rem)] font-bold uppercase tracking-widest">Total</dt>
            <dd className="flex items-baseline gap-2">
              <span className="font-display text-[clamp(1.4rem,2.2vw,2.6rem)] font-black leading-none tabular-nums">
                {totalPool.toLocaleString("es-MX")}
              </span>{" "}
              <span className="text-[clamp(0.85rem,1.1vw,1.2rem)] font-semibold">participan</span>
            </dd>
          </div>
        </dl>
      )}

      <nav aria-label="Premios" className="mt-[clamp(0.75rem,2vh,1.5rem)] flex flex-wrap items-center gap-x-6 gap-y-2">
        {RAFFLE_CATEGORIES.map((category) => (
          <div key={category} className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[clamp(0.7rem,0.9vw,0.95rem)] font-bold uppercase tracking-widest ${CATEGORY_CHIP[category]}`}
            >
              {category}
            </span>
            {RAFFLE_PRIZES.filter((p) => p.category === category).map((p) => {
              const n = filled[p.key] ?? 0;
              const selected = p.key === prize.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={(event) => {
                    // Sin foco en el boton, Espacio/Enter sortean el premio elegido.
                    event.currentTarget.blur();
                    choose(p.key);
                  }}
                  disabled={phase === "spinning"}
                  aria-pressed={selected}
                  title={`${prizeTitle(p)} · ${n} de ${p.slots}`}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[clamp(0.75rem,0.95vw,1rem)] font-semibold transition disabled:cursor-not-allowed ${
                    selected
                      ? "border-white bg-white text-navy"
                      : n >= p.slots
                        ? "border-white/15 text-white/45"
                        : "border-white/30 text-white hover:bg-white/10"
                  }`}
                >
                  <span>{p.label}</span>
                  <SlotDots filled={n} slots={p.slots} size="sm" dark={selected} />
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <section className="flex flex-1 flex-col items-center justify-center gap-[clamp(1rem,3vh,2.5rem)] py-[clamp(1rem,3vh,2rem)] text-center">
        {phase === "idle" && (
          <div
            key={prize.key}
            className="animate-scan-in grid w-full max-w-[min(96vw,120rem)] items-center gap-[clamp(1.5rem,4vw,5rem)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
          >
            <div className="flex justify-center">
              <PrizeImage key={prize.key} prize={prize} />
            </div>
            <div className="flex flex-col items-center gap-[clamp(0.5rem,1.6vh,1.25rem)] text-center lg:items-start lg:text-left">
              <span
                className={`rounded-full px-4 py-1 text-[clamp(0.8rem,1.1vw,1.15rem)] font-bold uppercase tracking-[0.2em] ${CATEGORY_CHIP[prize.category]}`}
              >
                Premio para {prize.category}
              </span>
              <p className="font-display text-[clamp(1.4rem,2.6vw,3rem)] font-black uppercase leading-none tracking-widest text-gold">
                {prize.label}
              </p>
              <h2 className="font-display text-[clamp(2rem,min(4.6vw,7.5vh),5.5rem)] font-black uppercase leading-[0.95]">
                {prize.name}
              </h2>
              {prize.items.length > 1 && (
                <ul className="mt-1 grid gap-[clamp(0.2rem,0.8vh,0.6rem)] text-[clamp(0.95rem,min(1.5vw,2.4vh),1.7rem)] text-white/90">
                  {prize.items.map((item) => (
                    <li key={item} className="flex items-baseline gap-3">
                      <span aria-hidden className="h-2 w-2 shrink-0 translate-y-[-0.15em] rounded-full bg-gold" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 flex items-center gap-3 text-[clamp(0.9rem,1.3vw,1.4rem)] text-white/75">
                <SlotDots filled={taken} slots={prize.slots} />
                {prize.slots === 1
                  ? taken
                    ? "Ya tiene ganador"
                    : "1 ganador"
                  : `${taken} de ${prize.slots} ganadores`}
              </p>
              <p className="text-[clamp(0.9rem,1.3vw,1.4rem)] font-semibold">
                Participan <span className="tabular-nums text-gold">{pool.toLocaleString("es-MX")}</span>{" "}
                {categoryPlural(prize.category)}
              </p>
            </div>
          </div>
        )}

        {/* Fuera de "idle": un anular fallido se ve aunque el ganador siga en pantalla. */}
        {error && phase !== "spinning" && (
          <p role="alert" className="rounded-xl bg-brand px-6 py-3 text-xl font-semibold">
            {error}
          </p>
        )}

        {phase === "spinning" && (
          <div className="flex w-full flex-col items-center gap-4">
            <p className="text-[clamp(0.9rem,1.4vw,1.5rem)] font-semibold uppercase tracking-[0.2em] text-white/70">
              Sorteando {prizeTitle(prize)} · {prize.category}
            </p>
            <div className="flex items-baseline gap-4">
              <p className="font-display text-[clamp(1.6rem,3.5vw,4rem)] font-black uppercase">{stage}</p>
              {!stage.startsWith("¡") && (
                <p className="font-display text-[clamp(1.6rem,3.5vw,4rem)] font-black tabular-nums text-gold">
                  {left.toLocaleString("es-MX")}
                </p>
              )}
            </div>
            <ul
              aria-hidden
              className="grid w-full max-w-[min(96vw,110rem)] grid-cols-3 gap-[clamp(0.25rem,0.6vw,0.6rem)] sm:grid-cols-4 lg:grid-cols-6"
            >
              {tiles.map((tile, i) => (
                <li
                  key={i}
                  className={`truncate rounded-lg px-2 py-[clamp(0.3rem,1vh,0.8rem)] text-[clamp(0.7rem,1.05vw,1.15rem)] font-semibold transition-all duration-150 ${
                    tile.hot
                      ? "scale-110 bg-brand text-white shadow-[0_0_30px_rgba(226,0,26,0.8)] ring-4 ring-white"
                      : tile.out
                        ? "scale-90 bg-white/5 text-white/20 line-through"
                        : "bg-white/12 text-white"
                  }`}
                >
                  {tile.name}
                </li>
              ))}
            </ul>
            <p className="text-sm text-white/55">
              Muestra al azar de los {pool.toLocaleString("es-MX")} {categoryPlural(prize.category)} · el
              ganador lo elige el servidor con azar criptográfico
            </p>
          </div>
        )}

        {phase === "revealed" && winner && (
          <div className="animate-scan-in flex w-full flex-col items-center gap-[clamp(0.5rem,2vh,1.5rem)]">
            <p className="rounded-full bg-gold px-6 py-1.5 font-display text-[clamp(1.1rem,2.2vw,2.4rem)] font-black uppercase tracking-widest text-navy">
              ¡Ganador!
            </p>
            <p
              aria-live="assertive"
              className="max-w-[90vw] font-display text-[clamp(2.4rem,min(7vw,10vh),9rem)] font-black uppercase leading-[0.95] drop-shadow-[0_6px_0_rgba(226,0,26,0.9)]"
            >
              {winner.name}
            </p>
            {(winner.company || winner.state) && (
              <p className="text-[clamp(1.1rem,2.2vw,2.4rem)] font-semibold text-white/85">
                {[winner.company, winner.state].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="font-mono text-[clamp(0.9rem,1.4vw,1.5rem)] tracking-[0.35em] text-white/60">{winner.code}</p>
            <div className="mt-[clamp(0.25rem,1.5vh,1rem)] flex items-center gap-[clamp(1rem,2vw,2rem)] rounded-3xl bg-white/10 p-[clamp(0.6rem,1.2vw,1rem)] pr-[clamp(1.25rem,2.5vw,2.5rem)] text-left ring-1 ring-white/20">
              <PrizeImage key={won.key} prize={won} compact />
              <div>
                <p className="text-[clamp(0.8rem,1.1vw,1.15rem)] font-semibold uppercase tracking-[0.25em] text-white/65">
                  Se lleva
                </p>
                <p className="font-display text-[clamp(1.1rem,2vw,2.2rem)] font-black uppercase leading-none text-gold">
                  {won.label}
                </p>
                <p className="font-display text-[clamp(1.4rem,2.8vw,3.2rem)] font-black uppercase leading-tight">
                  {won.name}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={primary}
            disabled={buttonDisabled}
            className="rounded-2xl bg-brand px-[clamp(2rem,5vw,5rem)] py-[clamp(0.7rem,2vh,1.6rem)] font-display text-[clamp(1.4rem,min(3.2vw,5.2vh),3.6rem)] font-black uppercase tracking-wider text-white shadow-[0_10px_0_#a80014] transition active:translate-y-1 active:shadow-[0_5px_0_#a80014] disabled:opacity-50"
          >
            {buttonLabel}
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
        {phase === "idle" && blocked && !error && <p className="text-white/70">{blocked}</p>}
      </section>

      {winners.length > 0 && (
        <footer className="border-t border-white/15 pt-4">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-white/60">
            Ganadores ({valid.length})
          </p>
          <ol className="flex flex-wrap gap-2">
            {winners.map((w) => {
              const p = rafflePrize(w.prizeKey);
              return (
                <li
                  key={w.id}
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-[clamp(0.85rem,1.1vw,1.15rem)] ${
                    w.voided ? "bg-white/5 text-white/40 line-through" : "bg-white/12 font-semibold"
                  }`}
                >
                  <span>{w.name}</span>
                  <span className={`text-[0.85em] font-normal ${w.voided ? "" : "text-gold"}`}>
                    · {p ? prizeTitle(p) : "sin premio"}
                  </span>
                  {!w.voided && !fullscreen && phase !== "spinning" && (
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
              );
            })}
          </ol>
        </footer>
      )}
    </div>
  );
}
