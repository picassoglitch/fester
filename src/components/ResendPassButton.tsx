"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resendPassAsAdmin, type ActionState } from "@/app/actions/admin";

function Submit({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Enviando…" : "Reenviar pase"}
    </button>
  );
}

/** Boton del admin para reenviar el pase al correo guardado del asistente. */
export default function ResendPassButton({ code, compact = false }: { code: string; compact?: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(resendPassAsAdmin, {});

  return (
    <form action={action} className={compact ? "space-y-1" : "space-y-2"}>
      <input type="hidden" name="code" value={code} />
      <Submit
        className={
          compact
            ? "whitespace-nowrap text-xs text-white/70 underline underline-offset-4 disabled:opacity-50"
            : "btn btn-ghost w-full text-sm"
        }
      />
      {state.error && (
        <p role="alert" className="text-xs text-alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="text-xs text-success">
          {state.ok}
        </p>
      )}
    </form>
  );
}
