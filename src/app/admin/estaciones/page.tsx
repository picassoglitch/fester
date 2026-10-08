import { prisma } from "@/lib/db";
import { moveStation, renameStation } from "@/app/actions/admin";
import StationForm from "@/components/StationForm";
import StationChangeConfirm from "@/components/StationChangeConfirm";
import { getStationChangeImpact } from "@/lib/stations";

export const dynamic = "force-dynamic";

export default async function StationsPage() {
  const [stations, impact] = await Promise.all([
    prisma.station.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { scans: true } } },
    }),
    getStationChangeImpact(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Estaciones</h1>
        <p className="mt-1 text-sm text-white/55">
          Cada estación activa vale una estrella y el premio pide todas las activas. Quien ya
          completó el recorrido sigue completo aunque agregues o reactives estaciones.
        </p>
      </div>

      <section className="card p-5">
        <StationForm />
      </section>

      <ul className="space-y-3">
        {stations.length === 0 && (
          <li className="card p-5 text-center text-sm text-white/50">
            Todavía no hay estaciones. Crea la primera arriba.
          </li>
        )}

        {stations.map((station, index) => (
          <li key={station.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <form action={renameStation} className="flex flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={station.id} />
                <input
                  name="emoji"
                  defaultValue={station.emoji}
                  className="field w-16 text-center"
                  maxLength={4}
                  aria-label="Emoji"
                />
                <input
                  name="name"
                  defaultValue={station.name}
                  className="field min-w-[12rem] flex-1"
                  maxLength={60}
                  aria-label="Nombre"
                />
                <button type="submit" className="btn btn-ghost px-4 py-2 text-sm">
                  Guardar
                </button>
              </form>

              <div className="flex items-center gap-1.5">
                <form action={moveStation}>
                  <input type="hidden" name="id" value={station.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    type="submit"
                    className="btn btn-ghost px-3 py-2 text-sm"
                    disabled={index === 0}
                    aria-label="Subir"
                  >
                    ↑
                  </button>
                </form>
                <form action={moveStation}>
                  <input type="hidden" name="id" value={station.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    className="btn btn-ghost px-3 py-2 text-sm"
                    disabled={index === stations.length - 1}
                    aria-label="Bajar"
                  >
                    ↓
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
              <span>
                {station._count.scans} escaneos ·{" "}
                {station.active ? (
                  <span className="text-success">activa</span>
                ) : (
                  <span className="text-white/40">inactiva</span>
                )}
              </span>
              <StationChangeConfirm
                station={{
                  id: station.id,
                  name: station.name,
                  active: station.active,
                  scans: station._count.scans,
                }}
                impact={{
                  completed: impact.completed,
                  redeemed: impact.redeemed,
                  inProgress: impact.inProgress,
                  completesWithout: impact.completesWithout[station.id] ?? 0,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
