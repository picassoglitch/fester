import { getRaffleState } from "@/lib/raffle";
import RaffleStage from "@/components/RaffleStage";
import EnableArrivedButton from "@/components/EnableArrivedButton";

export const dynamic = "force-dynamic";

export default async function RafflePage() {
  const { pools, pending, reels, filled, winners } = await getRaffleState();

  return (
    <>
      <EnableArrivedButton count={pending.Aplicador + pending.Profesionista} />
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
    </>
  );
}
