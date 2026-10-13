import LiveMap from "@/components/LiveMap";
import { getMapSnapshot } from "@/lib/map";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const snapshot = await getMapSnapshot();
  return <LiveMap initial={snapshot} />;
}
