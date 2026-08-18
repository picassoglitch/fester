import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { normalizeCode } from "@/lib/codes";
import { formatDateTime, formatDuration, formatTime } from "@/lib/format";
import { appUrl } from "@/lib/site";
import { deleteAttendee, setPrizeState, undoScan } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export default async function AttendeeJourneyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = normalizeCode(rawCode);

  const attendee = await prisma.attendee.findUnique({
    where: { code },
    include: {
      redeemedBy: { select: { name: true } },
      scans: {
        orderBy: { createdAt: "asc" },
        include: {
          station: { select: { name: true, emoji: true, active: true } },
          staff: { select: { name: true } },
        },
      },
    },
  });
  if (!attendee) notFound();

  const stations = await prisma.station.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  const visited = new Set(attendee.scans.map((s) => s.stationId));
  const missing = stations.filter((s) => !visited.has(s.id));
  const stars = stations.filter((s) => visited.has(s.id)).length;

  const timeline = [
    {
      key: "registro",
      at: attendee.createdAt,
      title: "Se registró",
      detail: `Código ${attendee.code}`,
      emoji: "📝",
      scanId: null as string | null,
    },
    ...attendee.scans.map((scan) => ({
      key: scan.id,
      at: scan.createdAt,
      title: scan.station.name,
      detail: `Escaneó ${scan.staff?.name ?? "staff dado de baja"}${
        scan.station.active ? "" : " · estación inactiva"
      }`,
      emoji: scan.station.emoji,
      scanId: scan.id,
    })),
    ...(attendee.completedAt
      ? [
          {
            key: "completo",
            at: attendee.completedAt,
            title: "Completó el recorrido",
            detail: `${formatDuration(
              attendee.completedAt.getTime() - attendee.createdAt.getTime(),
            )} desde su registro`,
            emoji: "🎉",
            scanId: null,
          },
        ]
      : []),
    ...(attendee.redeemedAt
      ? [
          {
            key: "premio",
            at: attendee.redeemedAt,
            title: "Recibió su premio",
            detail: attendee.redeemedBy?.name ?? "—",
            emoji: "🎁",
            scanId: null,
          },
        ]
      : []),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <div className="space-y-5">
      <Link href="/admin/asistentes" className="text-sm text-white/50 hover:underline">
        ← Asistentes
      </Link>

      <header className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <h1 className="text-2xl font-bold">{attendee.name}</h1>
          <p className="font-mono text-sm tracking-[0.3em] text-white/45">{attendee.code}</p>
          <p className="mt-2 text-sm text-white/60">
            {attendee.email ?? "sin correo"} · {attendee.phone ?? "sin teléfono"}
          </p>
          <p className="mt-1 text-sm text-white/45">
            Registro {formatDateTime(attendee.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">
            <span className="text-star">★</span> {stars}
            <span className="text-lg font-medium text-white/40"> / {stations.length}</span>
          </p>
          <p className="mt-1 text-sm text-white/55">
            {missing.length === 0 ? "Recorrido completo" : `Le faltan ${missing.length}`}
          </p>
          <Link
            href={`/pase/${attendee.code}`}
            className="mt-2 inline-block text-xs text-white/45 underline underline-offset-4"
            target="_blank"
          >
            Ver su pase
          </Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/60">
            Recorrido
          </h2>
          <ol className="space-y-1">
            {timeline.map((item, index) => {
              const previous = timeline[index - 1];
              const gap = previous ? item.at.getTime() - previous.at.getTime() : 0;
              return (
                <li key={item.key} className="relative flex gap-3 pb-4 last:pb-0">
                  <div className="flex flex-col items-center">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/5">
                      {item.emoji}
                    </span>
                    {index < timeline.length - 1 && <span className="mt-1 w-px flex-1 bg-white/12" />}
                  </div>
                  <div className="flex-1 pt-1.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs tabular-nums text-white/45">
                        {formatTime(item.at)}
                        {previous && <span className="ml-2 text-white/30">+{formatDuration(gap)}</span>}
                      </p>
                    </div>
                    <p className="text-xs text-white/45">{item.detail}</p>
                    {item.scanId && (
                      <form action={undoScan} className="mt-1">
                        <input type="hidden" name="scanId" value={item.scanId} />
                        <input type="hidden" name="code" value={attendee.code} />
                        <button
                          type="submit"
                          className="text-xs text-coral/80 underline underline-offset-4"
                        >
                          Revertir escaneo
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="space-y-4 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
              Estaciones pendientes
            </h2>
            {missing.length === 0 ? (
              <p className="text-sm text-mint">Ninguna. Ya puede reclamar su premio.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {missing.map((station) => (
                  <li key={station.id} className="flex items-center gap-2 text-white/70">
                    <span>{station.emoji}</span> {station.name}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">Premio</h2>
            {attendee.redeemedAt ? (
              <>
                <p className="text-sm text-white/70">
                  Entregado {formatDateTime(attendee.redeemedAt)}
                  {attendee.redeemedBy ? ` por ${attendee.redeemedBy.name}` : ""}
                </p>
                <form action={setPrizeState}>
                  <input type="hidden" name="code" value={attendee.code} />
                  <input type="hidden" name="deliver" value="0" />
                  <button type="submit" className="btn btn-ghost w-full text-sm">
                    Revertir entrega
                  </button>
                </form>
              </>
            ) : attendee.completedAt ? (
              <form action={setPrizeState}>
                <input type="hidden" name="code" value={attendee.code} />
                <input type="hidden" name="deliver" value="1" />
                <button type="submit" className="btn btn-primary w-full text-sm">
                  Marcar premio entregado
                </button>
              </form>
            ) : (
              <p className="text-sm text-white/50">
                Disponible cuando complete todas las estaciones.
              </p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
              QR del pase
            </h2>
            <p className="break-all font-mono text-xs text-white/45">
              {appUrl()}/s/{attendee.code}
            </p>
            <form action={deleteAttendee} className="mt-4 border-t border-white/8 pt-4">
              <input type="hidden" name="code" value={attendee.code} />
              <button type="submit" className="text-xs text-coral/80 underline underline-offset-4">
                Eliminar asistente y su historial
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
