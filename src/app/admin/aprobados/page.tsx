import { prisma } from "@/lib/db";
import ApprovedImport from "@/components/ApprovedImport";

export const dynamic = "force-dynamic";

export default async function ApprovedPage() {
  const [approved, total] = await Promise.all([
    prisma.attendee.count({ where: { approved: true } }),
    prisma.attendee.count(),
  ]);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Aprobados</h1>
        <p className="text-sm text-white/60">
          {approved} de {total} pases aprobados. Entran a la rifa y pasan la puerta sin aviso.
        </p>
      </header>
      <section className="card max-w-2xl space-y-3 p-5">
        <h2 className="font-semibold">Subir lista de Fester</h2>
        <p className="text-sm text-white/60">
          Excel (.xlsx) con la hoja <b>REGISTROS</b>: aprobado = «Sí» en la columna <b>ok</b> (C). Reemplaza la lista
          anterior completa; quien no venga con «Sí» queda no aprobado.
        </p>
        <ApprovedImport />
      </section>
    </div>
  );
}
