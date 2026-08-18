import { getDashboardStats } from "@/lib/stats";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const stats = await getDashboardStats();
  return <Dashboard initial={stats} />;
}
