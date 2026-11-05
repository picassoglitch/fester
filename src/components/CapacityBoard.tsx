import type { AccessCounts } from "@/lib/access";

/** Contador grande para proyectar: se lee a 10 m. */
export default function CapacityBoard({ counts }: { counts: AccessCounts }) {
  const pct = Math.min(100, Math.round((counts.inside / counts.capacity) * 100));
  const level = pct >= 100 ? "bg-brand" : pct >= 90 ? "bg-gold" : "bg-success";
  return (
    <div className="space-y-6">
      <div className="card p-6 text-center sm:p-10">
        <p className="text-sm uppercase tracking-[0.3em] text-white/60">Personas en el foro</p>
        <p className="font-display text-[clamp(6rem,22vw,16rem)] font-bold leading-none tabular-nums">
          {counts.inside}
          <span className="text-[0.35em] text-white/45"> / {counts.capacity}</span>
        </p>
        <div className="mx-auto mt-6 h-5 max-w-3xl overflow-hidden rounded-full bg-white/10" role="meter" aria-valuemin={0} aria-valuemax={counts.capacity} aria-valuenow={counts.inside} aria-label="Aforo">
          <div className={`h-full ${level} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-lg font-semibold">
          {pct >= 100 ? "Aforo lleno" : `Quedan ${counts.capacity - counts.inside} lugares`}
        </p>
      </div>
      <div className="card mx-auto max-w-xs p-4 text-center">
        <p className="text-xs text-white/60">Entraron hoy</p>
        <p className="text-3xl font-bold tabular-nums">{counts.entered}</p>
      </div>
    </div>
  );
}
