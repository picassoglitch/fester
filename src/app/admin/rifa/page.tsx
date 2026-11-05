import { getRaffleState, getReelNames } from "@/lib/raffle";
import RaffleStage from "@/components/RaffleStage";

export const dynamic = "force-dynamic";

export default async function RafflePage() {
  const [{ pool, winners }, reel] = await Promise.all([getRaffleState(), getReelNames()]);

  return (
    <RaffleStage
      pool={pool}
      reel={reel}
      winners={winners.map((w) => ({
        id: w.id,
        name: w.name,
        code: w.code,
        company: w.company,
        state: w.state,
        voided: w.voidedAt !== null,
      }))}
    />
  );
}
