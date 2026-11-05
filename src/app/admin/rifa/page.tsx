import { getRaffleState } from "@/lib/raffle";
import RaffleStage from "@/components/RaffleStage";

export const dynamic = "force-dynamic";

export default async function RafflePage() {
  const { pools, pending, reels, filled, winners } = await getRaffleState();

  return (
    <RaffleStage
      pools={pools}
      pending={pending}
      reels={reels}
      filled={filled}
      winners={winners.map((w) => ({
        id: w.id,
        name: w.name,
        code: w.code,
        company: w.company,
        state: w.state,
        prizeKey: w.prizeKey,
        voided: w.voidedAt !== null,
      }))}
    />
  );
}
