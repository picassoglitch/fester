import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "en-curso", label: "En curso" },
  { key: "completos", label: "Completos" },
  { key: "premio-pendiente", label: "Premio pendiente" },
  { key: "premio-entregado", label: "Premio entregado" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function whereFor(filter: FilterKey, q: string): Prisma.AttendeeWhereInput {
  const search: Prisma.AttendeeWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { code: { contains: q.toUpperCase() } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      }
    : {};

  const status: Prisma.AttendeeWhereInput =
    filter === "en-curso"
      ? { completedAt: null }
      : filter === "completos"
        ? { completedAt: { not: null } }
        : filter === "premio-pendiente"
          ? { completedAt: { not: null }, redeemedAt: null }
          : filter === "premio-entregado"
            ? { redeemedAt: { not: null } }
            : {};

  return { AND: [search, status] };
}

export default async function AttendeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtro?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const filter = (FILTERS.find((f) => f.key === params.filtro)?.key ?? "todos") as FilterKey;
  const page = Math.max(1, Number(params.pagina ?? 1) || 1);
  const where = whereFor(filter, q);

  const [stations, total, attendees] = await Promise.all([
    prisma.station.findMany({ where: { active: true }, select: { id: true } }),
    prisma.attendee.count({ where }),
    prisma.attendee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { scans: { select: { stationId: true, createdAt: true } } },
    }),
  ]);

  const activeIds = new Set(stations.map((s) => s.id));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows = attendees.map((attendee) => {
    const stars = attendee.scans.filter((s) => activeIds.has(s.stationId)).length;
    const lastScan = attendee.scans.reduce<Date | null>(
      (latest, scan) => (!latest || scan.createdAt > latest ? scan.createdAt : latest),
      null,
    );
    return { attendee, stars, lastScan };
  });

  function href(next: Partial<{ q: string; filtro: string; pagina: number }>) {
    const search = new URLSearchParams();
    const value = { q, filtro: filter, pagina: page, ...next };
    if (value.q) search.set("q", value.q);
    if (value.filtro && value.filtro !== "todos") search.set("filtro", value.filtro);
    if (value.pagina && value.pagina > 1) search.set("pagina", String(value.pagina));
    const qs = search.toString();
    return `/admin/asistentes${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          Asistentes <span className="text-base font-normal text-white/45">({total})</span>
        </h1>
        <div className="flex gap-2">
          <a href="/api/admin/export/asistentes" className="btn btn-ghost px-4 py-2 text-sm">
            CSV asistentes
          </a>
          <a href="/api/admin/export/escaneos" className="btn btn-ghost px-4 py-2 text-sm">
            CSV escaneos
          </a>
        </div>
      </div>

      <form className="flex gap-2" action="/admin/asistentes">
        {filter !== "todos" && <input type="hidden" name="filtro" value={filter} />}
        <input
          name="q"
          defaultValue={q}
          className="field flex-1"
          placeholder="Buscar por nombre, código, correo o teléfono"
        />
        <button type="submit" className="btn btn-ghost px-5">
          Buscar
        </button>
      </form>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {FILTERS.map((item) => (
          <Link
            key={item.key}
            href={href({ filtro: item.key, pagina: 1 })}
            className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition ${
              filter === item.key
                ? "border-brand bg-brand/20 text-white"
                : "border-white/12 text-white/60 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-white/45">
            <tr className="border-b border-white/10">
              <th className="px-4 py-3">Asistente</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Estrellas</th>
              <th className="px-4 py-3">Registro</th>
              <th className="px-4 py-3">Última actividad</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/45">
                  Sin resultados.
                </td>
              </tr>
            )}
            {rows.map(({ attendee, stars, lastScan }) => (
              <tr key={attendee.id} className="hover:bg-white/4">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/asistentes/${attendee.code}`}
                    className="font-medium hover:underline"
                  >
                    {attendee.name}
                  </Link>
                  <p className="text-xs text-white/40">{attendee.email ?? attendee.phone ?? "—"}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs tracking-widest text-white/60">
                  {attendee.code}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  <span className="text-gold">★</span> {stars}/{activeIds.size}
                </td>
                <td className="px-4 py-3 text-white/60">{formatDateTime(attendee.createdAt)}</td>
                <td className="px-4 py-3 text-white/60">
                  {lastScan ? formatDateTime(lastScan) : "—"}
                </td>
                <td className="px-4 py-3">
                  {attendee.redeemedAt ? (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">
                      🎁 Premio entregado
                    </span>
                  ) : attendee.completedAt ? (
                    <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs text-gold">
                      Listo para premio
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/6 px-2.5 py-1 text-xs text-white/55">
                      En curso
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-white/60">
          <Link
            href={href({ pagina: Math.max(1, page - 1) })}
            className={`btn btn-ghost px-4 py-2 ${page === 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            Anterior
          </Link>
          <span>
            Página {page} de {pages}
          </span>
          <Link
            href={href({ pagina: Math.min(pages, page + 1) })}
            className={`btn btn-ghost px-4 py-2 ${page === pages ? "pointer-events-none opacity-40" : ""}`}
          >
            Siguiente
          </Link>
        </div>
      )}
    </div>
  );
}
