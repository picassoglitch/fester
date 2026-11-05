"use client";

import { useEffect, useRef, useState } from "react";
import type { RafflePrize } from "@/lib/raffle-prizes";

/** Foto del premio sobre tarjeta blanca; sin archivo en public/rifa se ve la ficha tipográfica. */
export function PrizeImage({ prize, compact = false }: { prize: RafflePrize; compact?: boolean }) {
  const img = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);

  // Un 404 que llega antes de hidratar no dispara onError: se revisa al montar.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  useEffect(() => setFailed(false), [prize.image]);

  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-white shadow-[0_24px_60px_-20px_rgba(0,20,45,0.75),0_2px_6px_rgba(0,20,45,0.25)] ${
        compact
          ? "h-[clamp(6rem,14vh,11rem)] w-[clamp(8rem,19vh,14rem)] rounded-2xl p-3"
          : "h-[clamp(12rem,44vh,36rem)] w-full max-w-[52rem] rounded-[2rem] p-[clamp(1rem,3vh,2.5rem)]"
      }`}
    >
      {failed ? (
        <PrizePlaceholder prize={prize} compact={compact} />
      ) : (
        // Fotos de producto en public/rifa: sin optimizador para no escalarlas de mas.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={prize.image}
          ref={img}
          src={prize.image}
          alt={`${prize.label} · ${prize.name}`}
          onError={() => setFailed(true)}
          className="h-auto max-h-full w-auto max-w-full object-contain"
          draggable={false}
        />
      )}
    </div>
  );
}

function PrizePlaceholder({ prize, compact }: { prize: RafflePrize; compact: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1 text-center text-navy">
        <span className="font-display text-3xl font-black uppercase leading-none text-brand">{prize.label}</span>
        <span className="font-display text-sm font-bold uppercase leading-tight">{prize.name}</span>
      </div>
    );
  }
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-[clamp(0.4rem,1.5vh,1rem)] rounded-[1.4rem] border border-navy/10 bg-[radial-gradient(40rem_20rem_at_50%_0%,rgba(30,111,192,0.10),transparent_70%)] px-6 text-center text-navy">
      <span className="font-display text-[clamp(3rem,10vh,7.5rem)] font-black uppercase leading-none tracking-wider text-brand">
        {prize.label}
      </span>
      <span className="h-1 w-24 rounded-full bg-gold" aria-hidden />
      <span className="font-display text-[clamp(1.5rem,4.2vh,3rem)] font-black uppercase leading-tight">{prize.name}</span>
      {prize.items.length === 1 && (
        <span className="text-[clamp(1rem,2.2vh,1.5rem)] font-semibold text-navy/70">{prize.items[0]}</span>
      )}
      {prize.note && (
        <span className="rounded-full border border-navy/20 px-4 py-1 text-[clamp(0.8rem,1.6vh,1.1rem)] font-semibold uppercase tracking-[0.25em] text-navy/60">
          {prize.note}
        </span>
      )}
    </div>
  );
}

/** Lugares del premio: llenos en dorado, libres en contorno. */
export function SlotDots({
  filled,
  slots,
  size = "md",
  dark = false,
}: {
  filled: number;
  slots: number;
  size?: "sm" | "md";
  dark?: boolean;
}) {
  const dot = size === "sm" ? "h-2 w-2" : "h-[clamp(0.7rem,1.4vh,1rem)] w-[clamp(0.7rem,1.4vh,1rem)]";
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {Array.from({ length: slots }, (_, i) => (
        <span key={i} className={`${dot} rounded-full ${i < filled ? "bg-gold" : dark ? "border-2 border-navy/40" : "border-2 border-white/60"}`} />
      ))}
    </span>
  );
}
