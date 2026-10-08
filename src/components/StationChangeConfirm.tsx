"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteStation, toggleStation } from "@/app/actions/admin";

type Change = "activar" | "desactivar" | "eliminar";

function people(n: number): string {
  return n === 1 ? "1 persona" : `${n} personas`;
}

function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary px-4 py-2 text-sm" disabled={pending}>
      {pending ? "Aplicando…" : label}
    </button>
  );
}

/**
 * Botones de activar/desactivar/eliminar con confirmacion en la misma pagina:
 * antes de aplicar, el admin ve a cuantas personas les cambia algo.
 */
export default function StationChangeConfirm({
  station,
  impact,
}: {
  station: { id: string; name: string; active: boolean; scans: number };
  impact: { completed: number; redeemed: number; inProgress: number; completesWithout: number };
}) {
  const [change, setChange] = useState<Change | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Borrar una estacion borra sus escaneos en cascada: solo se permite sin escaneos.
  const canDelete = station.scans === 0;

  const toggleLabel = station.active ? "Desactivar" : "Activar";

  if (!change) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
        <button
          type="button"
          className="underline underline-offset-4"
          onClick={() => setChange(station.active ? "desactivar" : "activar")}
        >
          {toggleLabel}
        </button>
        {canDelete ? (
          <button
            type="button"
            className="text-alert/80 underline underline-offset-4"
            onClick={() => setChange("eliminar")}
          >
            Eliminar
          </button>
        ) : (
          <span className="text-white/40">
            No se puede eliminar: tiene escaneos. Desactívala para quitarla del recorrido.
          </span>
        )}
      </div>
    );
  }

  const lines: string[] = [];
  if (change === "activar") {
    lines.push(
      `${people(impact.inProgress)} que aún no completan también necesitarán «${station.name}» para el premio.`,
    );
  } else if (station.active && impact.completesWithout > 0) {
    lines.push(
      `${people(impact.completesWithout)} completarán el recorrido al quitarla (solo les faltaba esta).`,
    );
  }
  if (change === "eliminar") {
    lines.push(
      "No tiene escaneos. Se borra para siempre y no se puede deshacer.",
    );
  } else if (change === "desactivar") {
    lines.push("Sus escaneos se conservan.");
  }

  const serverAction = change === "eliminar" ? deleteStation : toggleStation;
  async function action(formData: FormData) {
    const result = await serverAction(formData);
    if (result && "error" in result && result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setChange(null);
  }
  const confirmLabel =
    change === "eliminar" ? "Sí, eliminar" : change === "activar" ? "Sí, activar" : "Sí, desactivar";

  return (
    <div
      role="alertdialog"
      aria-label={`Confirmar: ${change} ${station.name}`}
      className="w-full rounded-xl border border-white/12 bg-white/5 p-4 text-sm text-white/80"
    >
      <p className="font-semibold text-white">
        ¿{change[0].toUpperCase() + change.slice(1)} «{station.name}»?
      </p>
      <p className="mt-2">
        {impact.completed} personas ya completaron y seguirán completas. {impact.redeemed} tienen
        premio entregado.
      </p>
      {lines.map((line) => (
        <p key={line} className="mt-1">
          {line}
        </p>
      ))}
      {error && (
        <p role="alert" className="mt-2 text-alert">
          {error}
        </p>
      )}
      <form action={action} className="mt-3 flex flex-wrap items-center gap-3">
        <input type="hidden" name="id" value={station.id} />
        <input type="hidden" name="confirm" value="1" />
        {change !== "eliminar" && (
          <input type="hidden" name="active" value={change === "activar" ? "1" : "0"} />
        )}
        <ConfirmButton label={confirmLabel} />
        <button
          type="button"
          className="btn btn-ghost px-4 py-2 text-sm"
          onClick={() => {
            setError(null);
            setChange(null);
          }}
        >
          Cancelar
        </button>
      </form>
    </div>
  );
}
