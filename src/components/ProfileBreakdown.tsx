"use client";

import { useState } from "react";
import type { DashboardStats } from "@/lib/stats";
import { profileColor, profileLabel } from "@/lib/profiles";

type ProfileCount = { profile: string; count: number };

const WINDOWS = [
  { key: "todo", label: "Todo el día" },
  { key: "hora", label: "Última hora" },
] as const;

type WindowKey = (typeof WINDOWS)[number]["key"];

function percent(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

/** Barra apilada: cada perfil con su color, en proporcion a sus visitas. */
function StackedBar({ profiles, total }: { profiles: ProfileCount[]; total: number }) {
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/8">
      {profiles.map((row) => (
        <div
          key={row.profile}
          className="h-full transition-[width] duration-700"
          style={{ width: `${(row.count / total) * 100}%`, background: profileColor(row.profile) }}
          title={`${row.profile}: ${row.count} (${percent(row.count, total)}%)`}
        />
      ))}
    </div>
  );
}

function Dot({ profile }: { profile: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ background: profileColor(profile) }}
    />
  );
}

/**
 * Que perfiles (Puesto) visitan cada estacion, en vivo. Se actualiza con el
 * mismo sondeo del panel.
 */
export default function ProfileBreakdown({
  stations,
  profiles,
}: {
  stations: DashboardStats["stations"];
  profiles: DashboardStats["profiles"];
}) {
  const [range, setRange] = useState<WindowKey>("todo");
  const registered = profiles.reduce((sum, row) => sum + row.count, 0);
  const maxRegistered = Math.max(1, ...profiles.map((row) => row.count));

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <section className="card p-5 lg:col-span-3">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
            Perfiles por estación
          </h2>
          <div className="flex gap-1.5">
            {WINDOWS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setRange(item.key)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  range === item.key
                    ? "border-brand bg-brand/20 text-white"
                    : "border-white/12 text-white/60 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {stations.length === 0 ? (
          <p className="text-sm text-white/50">Aún no hay estaciones.</p>
        ) : (
          <ul className="space-y-4">
            {stations.map((station) => {
              const rows = [
                ...(range === "hora" ? station.profilesLastHour : station.profiles),
              ].sort((a, b) => b.count - a.count);
              const total = rows.reduce((sum, row) => sum + row.count, 0);
              const top = rows[0];
              return (
                <li key={station.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">
                      <span className="mr-1.5">{station.emoji}</span>
                      {station.name}
                      {!station.active && <span className="ml-2 text-xs text-white/35">(off)</span>}
                    </span>
                    <span className="whitespace-nowrap text-xs text-white/55">
                      {top ? (
                        <>
                          Perfil principal:{" "}
                          <span className="font-semibold" style={{ color: profileColor(top.profile) }}>
                            {profileLabel(top.profile)}
                          </span>{" "}
                          · {percent(top.count, total)}%
                        </>
                      ) : (
                        "sin visitas"
                      )}
                    </span>
                  </div>
                  {total > 0 && (
                    <>
                      <div className="mt-1.5">
                        <StackedBar profiles={rows} total={total} />
                      </div>
                      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/55">
                        {rows.slice(0, 4).map((row) => (
                          <span key={row.profile} className="flex items-center gap-1.5">
                            <Dot profile={row.profile} />
                            {profileLabel(row.profile)} {percent(row.count, total)}%
                          </span>
                        ))}
                        {rows.length > 4 && (
                          <span className="text-white/35">+{rows.length - 4} más</span>
                        )}
                      </p>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card p-5 lg:col-span-2">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/60">
          Registrados por perfil
        </h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-white/50">Sin registros aún.</p>
        ) : (
          <ul className="space-y-2">
            {[...profiles]
              .sort((a, b) => b.count - a.count)
              .map((row) => (
                <li key={row.profile} className="flex items-center gap-3 text-sm">
                  <span className="flex w-40 shrink-0 items-center gap-2 truncate text-white/70">
                    <Dot profile={row.profile} />
                    {profileLabel(row.profile)}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded-md bg-white/8">
                    <div
                      className="h-full rounded-md transition-[width] duration-700"
                      style={{
                        width: `${Math.round((row.count / maxRegistered) * 100)}%`,
                        background: profileColor(row.profile),
                      }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right tabular-nums text-white/60">
                    {row.count} · {percent(row.count, registered)}%
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
