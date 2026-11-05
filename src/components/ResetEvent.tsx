"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetEvent, type ResetState } from "@/app/actions/event";
import { RESET_WORD } from "@/lib/access";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn rounded-lg bg-brand px-5 font-bold text-white" disabled={pending}>
      {pending ? "Borrando…" : "Reiniciar evento"}
    </button>
  );
}

export default function ResetEvent() {
  const [state, action] = useActionState<ResetState, FormData>(resetEvent, {});
  return (
    <section className="card space-y-3 border-brand/50 p-5">
      <h2 className="font-semibold text-alert">Reiniciar evento</h2>
      <p className="text-sm text-white/70">
        Empieza de cero como si nadie hubiera llegado: borra entradas y salidas, estrellas de estaciones, recorridos
        completos, premios entregados y ganadores de la rifa. Conserva registros, aprobados, staff y estaciones. No se
        puede deshacer.
      </p>
      <form action={action} className="flex flex-col gap-2 sm:flex-row">
        <input
          name="confirm"
          className="field flex-1"
          placeholder={`Escribe ${RESET_WORD}`}
          autoComplete="off"
          aria-label={`Escribe ${RESET_WORD} para confirmar`}
        />
        <Submit />
      </form>
      {state.error && <p className="text-sm text-alert">{state.error}</p>}
      {state.ok && <p className="text-sm text-success">{state.ok}</p>}
    </section>
  );
}
