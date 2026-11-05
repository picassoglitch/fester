import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ApprovedPage() {
  const [approved, total] = await Promise.all([
    prisma.attendee.count({ where: { approved: true } }),
    prisma.attendee.count(),
  ]);
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Aprobados</h1>
        <p className="text-sm text-white/60">Lista validada por Fester (30-10 Registros, «Sí» en la hoja REGISTROS).</p>
      </header>
      <div className="card max-w-md p-6">
        <p className="font-display text-6xl font-bold tabular-nums">{approved}</p>
        <p className="text-sm text-white/60">de {total} pases aprobados. Solo ellos entran a la dinámica; la puerta deja pasar a todos.</p>
      </div>
    </div>
  );
}
