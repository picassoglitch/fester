"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { importApproved, type ImportState } from "@/app/actions/event";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary px-5" disabled={pending}>
      {pending ? "Leyendo Excel…" : "Subir y aplicar"}
    </button>
  );
}

export default function ApprovedImport() {
  const [state, action] = useActionState<ImportState, FormData>(importApproved, {});
  return (
    <form action={action} className="space-y-3">
      <input
        type="file"
        name="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        required
        className="field file:mr-3 file:rounded-md file:border-0 file:bg-white/15 file:px-3 file:py-1 file:text-white"
      />
      <Submit />
      {state.error && <p className="text-sm text-alert">{state.error}</p>}
      {state.ok && (
        <div className="space-y-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
          <p className="font-semibold text-success">
            {state.ok.approved} pases aprobados
            {state.ok.byEmail > 0 && ` (${state.ok.byEmail} por correo, sin código en el Excel)`}.{" "}
            {state.ok.notApproved} quedan como no aprobados.
          </p>
          {state.ok.notFound.length > 0 && (
            <details>
              <summary className="cursor-pointer text-white/70">
                {state.ok.notFound.length} del Excel no tienen pase en el sistema
              </summary>
              <p className="mt-1 break-words font-mono text-xs text-white/60">{state.ok.notFound.join(", ")}</p>
            </details>
          )}
          {state.ok.unmatched.length > 0 && (
            <p className="text-white/70">Sin código ni correo: {state.ok.unmatched.join(", ")}</p>
          )}
        </div>
      )}
    </form>
  );
}
