import { getAccessCounts } from "@/lib/access";
import AutoRefresh from "@/components/AutoRefresh";
import CapacityBoard from "@/components/CapacityBoard";
import ResetEvent from "@/components/ResetEvent";

export const dynamic = "force-dynamic";

export default async function CapacityPage() {
  const counts = await getAccessCounts();
  return (
    <div className="space-y-4">
      <AutoRefresh seconds={5} />
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Aforo en vivo</h1>
          <p className="text-sm text-white/60">Suma al escanear en la estación Registro y resta en Salida. Se actualiza cada 5 s.</p>
        </div>
      </header>
      <CapacityBoard counts={counts} />
      <div className="pt-8">
        <ResetEvent />
      </div>
    </div>
  );
}
