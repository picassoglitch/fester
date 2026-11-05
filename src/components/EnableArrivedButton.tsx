"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { enableArrived } from "@/app/actions/raffle";

/** Habilita de golpe a los aprobados que llegaron sin completar el pasaporte; pide confirmación. */
export default function EnableArrivedButton({ count }: { count: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    try {
      const res = await enableArrived().catch(() => null);
      setResult(
        res
          ? `${res.enabled.toLocaleString("es-MX")} habilitados para la rifa.`
          : "No se pudo habilitar. Intenta de nuevo.",
      );
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (count === 0 && !result) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-white/15 bg-navy/60 px-4 py-3 text-sm">
      {open ? (
        <>
          <p className="flex-1">
            ¿Habilitar a {count.toLocaleString("es-MX")} aprobados que llegaron
            sin completar el pasaporte? Entran a la rifa.
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={busy}
            className="rounded-lg border border-white/30 px-4 py-2 font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className="rounded-lg bg-gold px-4 py-2 font-bold text-navy disabled:opacity-50"
          >
            {busy ? "Habilitando…" : "Sí, habilitar"}
          </button>
        </>
      ) : (
        <>
          <p role="status" className="flex-1 text-white/70">
            {result}
          </p>
          {count > 0 && (
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setOpen(true);
              }}
              className="rounded-lg bg-gold px-4 py-2 font-bold text-navy"
            >
              Habilitar a los {count.toLocaleString("es-MX")} que llegaron sin
              completar
            </button>
          )}
        </>
      )}
    </div>
  );
}
