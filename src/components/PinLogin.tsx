"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFormStatus } from "react-dom";
import { loginWithPin, type LoginState } from "@/app/actions/session";
import { PIN_MAX, PIN_MIN_LOGIN } from "@/lib/pin";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "borrar", "0", "ok"];

// Si el foco esta en otro campo, las teclas son de ese campo, no del PIN.
const OTHER_FIELD = "input, textarea, select, [contenteditable='true']";
const PIN_KEY = /^([0-9]|Backspace|Enter)$/;

/**
 * Hasta que React hidrata no hay listener de teclado: en un telefono lento (o
 * en dev) eso son segundos, y lo que se teclea al abrir /staff se perdia. Este
 * script va en el HTML del servidor, corre antes de hidratar y guarda las
 * teclas; al montar, PinLogin las aplica.
 */
const BUFFER_SCRIPT = `(function(){var k=[];function h(e){if(e.metaKey||e.ctrlKey||e.altKey)return;var t=e.target;if(t&&t.closest&&t.closest(${JSON.stringify(OTHER_FIELD)}))return;if(!${PIN_KEY}.test(e.key))return;e.preventDefault();k.push(e.key)}window.addEventListener("keydown",h);window.__festerPinKeys={keys:k,stop:function(){window.removeEventListener("keydown",h)}}})();`;

type PinBuffer = { keys: string[]; stop: () => void };

/** true solo en el servidor y durante la hidratacion. */
function useIsPreHydration() {
  return useSyncExternalStore(
    () => () => {},
    () => false,
    () => true,
  );
}

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

  const preHydration = useIsPreHydration();
  // Enter que llego antes de hidratar: se envia cuando el PIN ya esta en el form.
  const [submitBuffered, setSubmitBuffered] = useState(false);

  // Teclado fisico: digitos, Backspace y Enter. No captura si el foco esta en
  // otro campo de texto.
  useEffect(() => {
    const win = window as Window & { __festerPinKeys?: PinBuffer };
    const buffer = win.__festerPinKeys;
    if (buffer) {
      buffer.stop();
      delete win.__festerPinKeys;
      let value = "";
      let enter = false;
      for (const key of buffer.keys) {
        if (key === "Backspace") value = value.slice(0, -1);
        else if (key === "Enter") enter = value.length >= PIN_MIN_LOGIN;
        else if (value.length < PIN_MAX) value += key;
        if (key !== "Enter") enter = false;
      }
      if (value) setPin(value);
      if (enter) setSubmitBuffered(true);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest(OTHER_FIELD)) return;

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
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!submitBuffered) return;
    setSubmitBuffered(false);
    formRef.current?.requestSubmit();
  }, [submitBuffered]);

  return (
    <form ref={formRef} action={action} className="w-full space-y-5">
      {/* Solo en el HTML del servidor: en un montaje en el cliente no hace falta. */}
      {preHydration && <script dangerouslySetInnerHTML={{ __html: BUFFER_SCRIPT }} />}
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
