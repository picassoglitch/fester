"use client";

import { useEffect, useRef, useState } from "react";
import type { AttendeeProgress } from "@/lib/attendee";
import QrCode from "@/components/QrCode";
import { formatTime } from "@/lib/format";

const POLL_MS = 10_000;

export default function PassView({
  initial,
  qrValue,
}: {
  initial: AttendeeProgress;
  qrValue: string;
}) {
  const [data, setData] = useState(initial);
  const [justEarned, setJustEarned] = useState<string | null>(null);
  const previousStars = useRef(initial.stars);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch(`/api/pase/${initial.code}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const next: AttendeeProgress = await res.json();
        setData(next);
        if (next.stars > previousStars.current) {
          const newest = next.stations
            .filter((s) => s.visitedAt)
            .sort((a, b) => (a.visitedAt! < b.visitedAt! ? 1 : -1))[0];
          setJustEarned(newest?.name ?? null);
          navigator.vibrate?.(120);
          setTimeout(() => setJustEarned(null), 4000);
        }
        previousStars.current = next.stars;
      } catch {
        /* sin red: reintenta en el siguiente ciclo */
      }
    }

    const timer = setInterval(refresh, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [initial.code]);

  useEffect(() => {
    try {
      localStorage.setItem("fester_code", initial.code);
    } catch {
      /* modo privado */
    }
  }, [initial.code]);

  const pct = data.total > 0 ? Math.round((data.stars / data.total) * 100) : 0;
  const done = data.total > 0 && data.pending === 0;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6 sm:py-10">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-grape">Tu pase</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{data.name}</h1>
        <p className="mt-1 font-mono text-sm tracking-[0.35em] text-white/45">{data.code}</p>
      </header>

      {justEarned && (
        <div className="animate-pop rounded-2xl border border-star/40 bg-star/10 px-4 py-3 text-center text-sm font-semibold text-star">
          ★ ¡Estrella conseguida en {justEarned}!
        </div>
      )}

      {data.redeemedAt ? (
        <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm text-white/70">
          🎁 Premio entregado a las {formatTime(data.redeemedAt)}
          {data.redeemedByName ? ` · ${data.redeemedByName}` : ""}
        </div>
      ) : done ? (
        <div className="animate-ring rounded-2xl border border-mint/40 bg-mint/10 px-4 py-3 text-center text-sm font-semibold text-mint">
          🎉 ¡Recorrido completo! Pasa al módulo de premios y muestra este código.
        </div>
      ) : null}

      <section className="card flex flex-col items-center gap-4 p-5">
        <QrCode value={qrValue} />
        <p className="text-center text-xs leading-relaxed text-white/45">
          Muéstralo en cada estación. El staff lo escanea y tu estrella aparece aquí sola.
        </p>
      </section>

      <section className="card p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-white/60">Estrellas</p>
            <p className="text-3xl font-bold">
              {data.stars}
              <span className="text-lg font-medium text-white/40"> / {data.total}</span>
            </p>
          </div>
          <p className="text-sm text-white/60">
            {data.pending > 0 ? (
              <>
                Te faltan <span className="font-semibold text-white">{data.pending}</span>
              </>
            ) : (
              <span className="font-semibold text-mint">Completo</span>
            )}
          </p>
        </div>

        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-grape to-star transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="mt-5 space-y-2">
          {data.stations.map((station) => (
            <li
              key={station.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                station.visitedAt
                  ? "border-star/30 bg-star/10"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <span className="text-xl">{station.emoji}</span>
              <span className="flex-1 text-sm font-medium">{station.name}</span>
              {station.visitedAt ? (
                <span className="text-right text-xs text-star">
                  ★ {formatTime(station.visitedAt)}
                </span>
              ) : (
                <span className="text-xs text-white/35">pendiente</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-xs text-white/30">
        Se actualiza solo cada 10 segundos · guarda esta página en tu pantalla de inicio
      </p>
    </main>
  );
}
