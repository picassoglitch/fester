import type { StaffStats } from "@/lib/staff-stats";
import { formatTime, relativeTime } from "@/lib/format";

function Tile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "gold" | "success";
}) {
  const color =
    tone === "gold" ? "text-gold" : tone === "success" ? "text-success" : "text-white";
  return (
    <div className="card p-3.5">
      <p className="text-[0.65rem] uppercase tracking-wide text-white/45">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[0.7rem] text-white/45">{hint}</p>}
    </div>
  );
}

export default function StaffOverview({ stats }: { stats: StaffStats }) {
  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-3">
        <Tile
          label="Registrados"
          value={stats.attendees}
          hint={`${stats.scansTotal} escaneos en total`}
        />
        <Tile
          label="Completaron"
          value={stats.completed}
          tone="success"
          hint={`${stats.completionRate}% de los registrados`}
        />
        <Tile
          label="Premios por dar"
          value={stats.pendingPrizes}
          tone="gold"
          hint={`${stats.redeemed} entregados`}
        />
        <Tile
          label="Última hora"
          value={stats.scansLastHour}
          hint={`tú llevas ${stats.myScans}`}
        />
      </section>

      <section className="card p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Avance del recorrido</h2>
          <span className="text-xs text-white/50">
            {stats.completed} de {stats.attendees}
          </span>
        </div>
        <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky to-brand transition-[width] duration-700"
            style={{ width: `${stats.completionRate}%` }}
          />
        </div>
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-semibold">Movimiento por estación</h2>
        <ul className="mt-3 space-y-2.5">
          {stats.stations.map((station) => (
            <li key={station.id}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80">
                  <span aria-hidden className="mr-1.5">
                    {station.emoji}
                  </span>
                  {station.name}
                </span>
                <span className="tabular-nums text-white/55">{station.scans}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full bg-sky/70" style={{ width: `${station.share}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-semibold">Últimos escaneos</h2>
        {stats.recent.length === 0 ? (
          <p className="mt-3 text-sm text-white/45">Todavía no hay escaneos.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {stats.recent.map((scan) => (
              <li key={scan.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{scan.name}</p>
                  <p className="truncate text-xs text-white/45">
                    <span className="font-mono tracking-wider">{scan.code}</span> · {scan.station}
                    {scan.staff ? ` · ${scan.staff}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-white/70">{formatTime(scan.at)}</p>
                  <p className="text-[0.65rem] text-white/35">{relativeTime(scan.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
