import { getDashboardStats } from "@/lib/stats";
import { getAccessCounts } from "@/lib/access";
import Dashboard from "@/components/Dashboard";
import CapacityBoard from "@/components/CapacityBoard";
import ResetEvent from "@/components/ResetEvent";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const [stats, counts] = await Promise.all([getDashboardStats(), getAccessCounts()]);
  return (
    <div className="space-y-8">
      <CapacityBoard counts={counts} />
      <Dashboard initial={stats} />
      <ResetEvent />
    </div>
  );
}
