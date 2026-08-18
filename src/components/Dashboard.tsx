"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DashboardStats } from "@/lib/stats";
import { formatDuration, formatTime, relativeTime } from "@/lib/format";

const POLL_MS = 20_000;

function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "star" | "mint" | "coral";
}) {
  const color =
    tone === "star"
      ? "text-star"
      : tone === "mint"
        ? "text-mint"
        : tone === "coral"
          ? "text-coral"
          : "text-white";
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-white/45">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-white/45">{hint}</p>}
    </div>
  );
}

export default function Dashboard({ initial }: { initial: DashboardStats }) {
  const [stats, setStats] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [live, setLive] = useState(true);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        setStats(await res.json());
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

  const { totals, stations, distribution, staff, feed, recentAttendees, registrationsByHour } =
    stats;
  const maxHour = Math.max(1, ...registrationsByHour.map((r) => r.count));
  const maxBucket = Math.max(1, ...distribution);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Panel en vivo</h1>
        <div className="flex items-center gap-3 text-xs text-white/50">
          <span className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-mint" : "bg-white/30"}`}
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
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Asistentes"
          value={totals.attendees}
          hint={`${totals.stations} estaciones activas`}
        />
        <Kpi
          label="Completaron"
          value={totals.completed}
          tone="mint"
          hint={
            totals.attendees > 0
              ? `${Math.round((totals.completed / totals.attendees) * 100)}% del total`
              : "sin datos"
          }
        />
        <Kpi
          label="Premios por entregar"
          value={totals.pendingPrizes}
          tone="star"
          hint={`${totals.redeemed} entregados`}
        />
        <Kpi
          label="Escaneos 15 min"
          value={totals.scansLast15}
          hint={`${totals.scansLastHour} en la última hora`}
        />
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Escaneos totales" value={totals.scans} />
        <Kpi label="Estrellas promedio" value={totals.avgStars.toFixed(1)} />
        <Kpi label="Avance global" value={`${Math.round(totals.progressRate * 100)}%`} />
        <Kpi
          label="Tiempo mediano"
          value={totals.medianCompletionMs ? formatDuration(totals.medianCompletionMs) : "—"}
          hint="registro → recorrido completo"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/60">
            Avance por estación
          </h2>
          {stations.length === 0 ? (
            <p className="text-sm text-white/50">
              Aún no hay estaciones.{" "}
              <Link href="/admin/estaciones" className="underline underline-offset-4">
                Crear la primera
              </Link>
            </p>
          ) : (
            <ul className="space-y-3.5">
              {stations.map((station) => (
                <li key={station.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">
                      <span className="mr-1.5">{station.emoji}</span>
                      {station.name}
                      {!station.active && <span className="ml-2 text-xs text-white/35">(off)</span>}
                    </span>
                    <span className="whitespace-nowrap tabular-nums text-white/60">
                      {station.visits} · {Math.round(station.rate * 100)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-grape to-star transition-[width] duration-700"
                      style={{ width: `${Math.min(100, Math.round(station.rate * 100))}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-white/35">
                    {station.pending} sin visitar ·{" "}
                    {station.lastScanAt ? `último ${formatTime(station.lastScanAt)}` : "sin escaneos"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/60">
            Distribución de estrellas
          </h2>
          <ul className="space-y-2">
            {distribution.map((count, stars) => (
              <li key={stars} className="flex items-center gap-3 text-sm">
                <span className="w-14 shrink-0 text-white/60">
                  {stars} <span className="text-star">★</span>
                </span>
                <div className="h-5 flex-1 overflow-hidden rounded-md bg-white/8">
                  <div
                    className={`h-full rounded-md transition-[width] duration-700 ${
                      stars === distribution.length - 1 ? "bg-mint" : "bg-grape"
                    }`}
                    style={{ width: `${Math.round((count / maxBucket) * 100)}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right tabular-nums text-white/60">{count}</span>
              </li>
            ))}
          </ul>

          {registrationsByHour.length > 0 && (
            <>
              <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-white/60">
                Registros por hora
              </h2>
              <div className="flex h-24 items-end gap-1.5">
                {registrationsByHour.map((row) => (
                  <div key={row.hour} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-coral/70"
                      style={{ height: `${Math.max(4, (row.count / maxHour) * 72)}px` }}
                      title={`${row.count} registros`}
                    />
                    <span className="text-[10px] text-white/35">{row.hour.slice(0, 2)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
            Actividad reciente
          </h2>
          {feed.length === 0 ? (
            <p className="text-sm text-white/50">Todavía no hay escaneos.</p>
          ) : (
            <ul className="divide-y divide-white/8">
              {feed.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="text-lg">{item.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/asistentes/${item.code}`}
                      className="truncate font-medium hover:underline"
                    >
                      {item.attendee}
                    </Link>
                    <p className="truncate text-xs text-white/45">
                      {item.station} · {item.staff}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs tabular-nums text-white/40">
                    {formatTime(item.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
              Últimos registros
            </h2>
            {recentAttendees.length === 0 ? (
              <p className="text-sm text-white/50">Sin registros aún.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentAttendees.map((person) => (
                  <li key={person.code} className="flex items-center justify-between gap-3">
                    <Link
                      href={`/admin/asistentes/${person.code}`}
                      className="truncate hover:underline"
                    >
                      {person.name}
                    </Link>
                    <span className="whitespace-nowrap text-xs text-white/40">
                      {formatTime(person.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
              Escaneos por staff
            </h2>
            {staff.length === 0 ? (
              <p className="text-sm text-white/50">Sin staff registrado.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {staff.map((person) => (
                  <li key={person.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">
                      {person.name}
                      {!person.active && <span className="ml-2 text-xs text-white/35">(off)</span>}
                    </span>
                    <span className="tabular-nums text-white/60">{person.scans}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
