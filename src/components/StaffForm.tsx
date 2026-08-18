"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createStaff, resetStaffPin, type ActionState } from "@/app/actions/admin";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary px-5" disabled={pending}>
      {pending ? "…" : label}
    </button>
  );
}

export function StaffForm() {
  const [state, action] = useActionState<ActionState, FormData>(createStaff, {});

  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input name="name" className="field flex-1" placeholder="Nombre" maxLength={60} required />
        <input
          name="pin"
          className="field sm:w-36 sm:text-center"
          placeholder="PIN"
          inputMode="numeric"
          pattern="\d{4,8}"
          maxLength={8}
          required
        />
        <select name="role" className="field sm:w-40" defaultValue="STAFF">
          <option value="STAFF" className="bg-night">
            Staff
          </option>
          <option value="ADMIN" className="bg-night">
            Administrador
          </option>
        </select>
        <Submit label="Agregar" />
      </div>
      {state.error && <p className="text-sm text-coral">{state.error}</p>}
      {state.ok && <p className="text-sm text-mint">{state.ok}</p>}
    </form>
  );
}

export function ResetPinForm({ id }: { id: string }) {
  const [state, action] = useActionState<ActionState, FormData>(resetStaffPin, {});

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        name="pin"
        className="field w-32 text-center"
        placeholder="Nuevo PIN"
        inputMode="numeric"
        pattern="\d{4,8}"
        maxLength={8}
        required
      />
      <button type="submit" className="btn btn-ghost px-4 py-2 text-sm">
        Cambiar PIN
      </button>
      {state.error && <span className="text-xs text-coral">{state.error}</span>}
      {state.ok && <span className="text-xs text-mint">{state.ok}</span>}
    </form>
  );
}
