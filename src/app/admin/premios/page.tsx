import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import AutoRefresh from "@/components/AutoRefresh";
import {
  PRIZE_ROW_SELECT,
  PRIZE_TABS,
  getPrizeCounts,
  parsePrizeTab,
  prizeOrder,
  prizeWhere,
  type PrizeTab,
} from "@/lib/prizes";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function PrizesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const tab = parsePrizeTab(params.tab);
  const page = Math.max(1, Number(params.pagina ?? 1) || 1);
  const where = prizeWhere(tab, q);

  const [counts, total, attendees] = await Promise.all([
    getPrizeCounts(),
    prisma.attendee.count({ where }),
    prisma.attendee.findMany({
      where,
      orderBy: prizeOrder(tab),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: PRIZE_ROW_SELECT,
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(next: Partial<{ q: string; tab: PrizeTab; pagina: number }>) {
    const search = new URLSearchParams();
    const value = { q, tab, pagina: page, ...next };
    if (value.q) search.set("q", value.q);
    if (value.tab && value.tab !== "pendientes") search.set("tab", value.tab);
    if (value.pagina && value.pagina > 1) search.set("pagina", String(value.pagina));
    const qs = search.toString();
    return `/admin/premios${qs ? `?${qs}` : ""}`;
  }

  const exportParams = new URLSearchParams({ tab });
  if (q) exportParams.set("q", q);

  return (
    <div className="space-y-4">
      <AutoRefresh seconds={15} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Premios</h1>
        <a
          href={`/api/admin/export/premios?${exportParams.toString()}`}
          className="btn btn-ghost px-4 py-2 text-sm"
        >
          CSV de esta vista
        </a>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-white/50">Completaron</p>
          <p className="text-2xl font-bold text-success">{counts.completed}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-white/50">Entregados</p>
          <p className="text-2xl font-bold">{counts.delivered}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-white/50">Pendientes por entregar</p>
          <p className="text-2xl font-bold text-gold">{counts.pending}</p>
        </div>
      </section>

      <form className="flex gap-2" action="/admin/premios">
        {tab !== "pendientes" && <input type="hidden" name="tab" value={tab} />}
        <input
          name="q"
          defaultValue={q}
          className="field flex-1"
          placeholder="Buscar por nombre o código"
        />
        <button type="submit" className="btn btn-ghost px-5">
          Buscar
        </button>
      </form>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {PRIZE_TABS.map((item) => (
          <Link
            key={item.key}
            href={href({ tab: item.key, pagina: 1 })}
            className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition ${
              tab === item.key
                ? "border-brand bg-brand/20 text-white"
                : "border-white/12 text-white/60 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <span className="self-center whitespace-nowrap px-2 text-sm text-white/45">
          {total} {total === 1 ? "persona" : "personas"}
        </span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-white/45">
            <tr className="border-b border-white/10">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Completó a las</th>
              <th className="px-4 py-3">Entregado a las</th>
              <th className="px-4 py-3">Entregado por</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {attendees.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/45">
                  Sin resultados.
                </td>
              </tr>
            )}
            {attendees.map((attendee) => (
              <tr key={attendee.id} className="hover:bg-white/4">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/asistentes/${attendee.code}`}
                    className="font-medium hover:underline"
                  >
                    {attendee.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs tracking-widest text-white/60">
                  {attendee.code}
                </td>
                <td className="px-4 py-3 text-white/60">{attendee.company ?? "—"}</td>
                <td className="px-4 py-3 text-white/60">
                  {attendee.completedAt ? (
                    formatDateTime(attendee.completedAt)
                  ) : attendee.redeemedAt ? (
                    <span className="rounded-full bg-white/6 px-2.5 py-1 text-xs text-white/55">
                      entregado antes de un cambio de estaciones
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-white/60">
                  {attendee.redeemedAt ? formatDateTime(attendee.redeemedAt) : "—"}
                </td>
                <td className="px-4 py-3 text-white/60">{attendee.redeemedBy?.name ?? "—"}</td>
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
