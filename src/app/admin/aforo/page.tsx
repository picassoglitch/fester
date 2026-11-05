import Link from "next/link";
import { getAccessCounts } from "@/lib/access";
import AutoRefresh from "@/components/AutoRefresh";
import CapacityBoard from "@/components/CapacityBoard";

export const dynamic = "force-dynamic";

export default async function CapacityPage() {
  const counts = await getAccessCounts();
  return (
    <div className="space-y-4">
      <AutoRefresh seconds={5} />
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Aforo en vivo</h1>
          <p className="text-sm text-white/60">Solo invitados, con QR de Entrada y Salida. Se actualiza cada 5 s.</p>
        </div>
        <Link href="/staff/acceso" className="btn btn-ghost px-4 text-sm">
          Abrir puerta (escáner)
        </Link>
      </header>
      <CapacityBoard counts={counts} />
    </div>
  );
}
