"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { selfRegisterAtDoor, type SelfSignupState } from "@/app/actions/door";
import { DoorFieldInputs, DoorPassCard } from "@/components/DoorFields";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full py-3.5 text-base" disabled={pending}>
      {pending ? "Creando tu pase…" : "Crear mi pase"}
    </button>
  );
}

export default function DoorSelfSignup({ token }: { token: string }) {
  const [state, action] = useActionState<SelfSignupState, FormData>(selfRegisterAtDoor, {});

  if (state.pass) {
    return (
      <div className="space-y-4">
        <DoorPassCard pass={state.pass} />
        <p className="text-center text-sm text-white/70">
          Muéstralo al staff de la entrada para que lo escaneen.
        </p>
        <a href={`/pase/${state.pass.code}`} className="btn btn-ghost w-full py-3">
          Abrir mi pase
        </a>
      </div>
    );
  }

  if (state.notice) {
    return (
      <p className="rounded-xl bg-gold/15 p-4 text-center text-gold" role="status">
        {state.notice}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="t" value={token} />
      <DoorFieldInputs />
      {state.error && (
        <p className="rounded-xl bg-[#c8102e]/25 p-3 text-sm" role="alert">
          {state.error}
        </p>
      )}
      <Submit />
    </form>
  );
}
