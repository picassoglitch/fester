"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createStation, type ActionState } from "@/app/actions/admin";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary px-5" disabled={pending}>
      {pending ? "Creando…" : "Agregar"}
    </button>
  );
}

export default function StationForm() {
  const [state, action] = useActionState<ActionState, FormData>(createStation, {});

  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="emoji"
          className="field sm:w-20 sm:text-center"
          placeholder="⭐"
          maxLength={4}
          aria-label="Emoji"
        />
        <input
          name="name"
          className="field flex-1"
          placeholder="Nombre de la estación"
          maxLength={60}
          required
        />
        <Submit />
      </div>
      {state.error && <p className="text-sm text-coral">{state.error}</p>}
      {state.ok && <p className="text-sm text-mint">{state.ok}</p>}
    </form>
  );
}
