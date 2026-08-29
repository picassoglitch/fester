"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginWithPin, type LoginState } from "@/app/actions/session";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "borrar", "0", "ok"];

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn-primary col-span-1 h-16 text-sm"
      disabled={disabled || pending}
    >
      {pending ? "…" : "Entrar"}
    </button>
  );
}

export default function PinLogin({ next }: { next: string }) {
  const [state, action] = useActionState<LoginState, FormData>(loginWithPin, {});
  const [pin, setPin] = useState("");

  return (
    <form action={action} className="w-full space-y-5">
      <input type="hidden" name="pin" value={pin} />
      <input type="hidden" name="next" value={next} />

      <div className="flex justify-center gap-2.5" aria-label="PIN">
        {Array.from({ length: 6 }).map((_, index) => (
          <span
            key={index}
            className={`h-3.5 w-3.5 rounded-full transition ${
              index < pin.length ? "bg-brand" : "bg-white/15"
            }`}
          />
        ))}
      </div>

      {state.error && <p className="text-center text-sm text-alert">{state.error}</p>}

      <div className="grid grid-cols-3 gap-2.5">
        {KEYS.map((key) => {
          if (key === "ok") return <SubmitButton key={key} disabled={pin.length < 4} />;
          if (key === "borrar") {
            return (
              <button
                key={key}
                type="button"
                className="btn btn-ghost h-16 text-sm"
                onClick={() => setPin((value) => value.slice(0, -1))}
              >
                ⌫
              </button>
            );
          }
          return (
            <button
              key={key}
              type="button"
              className="btn btn-ghost h-16 text-2xl font-semibold"
              onClick={() => setPin((value) => (value.length < 8 ? value + key : value))}
            >
              {key}
            </button>
          );
        })}
      </div>
    </form>
  );
}
