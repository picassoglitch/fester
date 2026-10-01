"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginWithPin, type LoginState } from "@/app/actions/session";
import { PIN_MAX, PIN_MIN_LOGIN } from "@/lib/pin";

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
  const formRef = useRef<HTMLFormElement>(null);
  const pinRef = useRef(pin);
  pinRef.current = pin;

  // Teclado fisico: digitos, Backspace y Enter. No captura si el foco esta en
  // otro campo de texto.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        setPin((value) => (value.length < PIN_MAX ? value + event.key : value));
      } else if (event.key === "Backspace") {
        event.preventDefault();
        setPin((value) => value.slice(0, -1));
      } else if (event.key === "Enter" && pinRef.current.length >= PIN_MIN_LOGIN) {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <form ref={formRef} action={action} className="w-full space-y-5">
      <input type="hidden" name="pin" value={pin} />
      <input type="hidden" name="next" value={next} />

      <div className="flex justify-center gap-2.5" aria-live="polite">
        <span className="sr-only">
          {pin.length} de {PIN_MAX} dígitos
        </span>
        {Array.from({ length: PIN_MAX }).map((_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={`h-3.5 w-3.5 rounded-full transition ${
              index < pin.length ? "bg-brand" : "bg-white/15"
            }`}
          />
        ))}
      </div>

      {state.error && <p className="text-center text-sm text-alert">{state.error}</p>}

      <div className="grid grid-cols-3 gap-2.5">
        {KEYS.map((key) => {
          if (key === "ok") return <SubmitButton key={key} disabled={pin.length < PIN_MIN_LOGIN} />;
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
              onClick={() => setPin((value) => (value.length < PIN_MAX ? value + key : value))}
            >
              {key}
            </button>
          );
        })}
      </div>
    </form>
  );
}
