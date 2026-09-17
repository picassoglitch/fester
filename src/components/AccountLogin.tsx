"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { accessAccount, type AccountState } from "@/app/actions/account";

function SubmitButton({ verifying }: { verifying: boolean }) {
  const { pending } = useFormStatus();
  const idle = verifying ? "Entrar a mi cuenta" : "Enviarme un código";
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? "Un momento…" : idle}
    </button>
  );
}

/** formNoValidate: sin el, el campo del codigo vacio frena el reenvio. */
function ResendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="intent"
      value="resend"
      formNoValidate
      className="underline underline-offset-2 hover:text-white disabled:opacity-50"
      disabled={pending}
    >
      Reenviar código
    </button>
  );
}

/**
 * Sesion del asistente: el correo con el que se registro recibe un codigo de
 * 6 digitos y con el entra a su pase, sin contrasenas que recordar.
 */
export default function AccountLogin() {
  const [state, action] = useActionState<AccountState, FormData>(accessAccount, {});
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const verifying = state.stage === "code" && !editing;

  useEffect(() => {
    if (state.stage === "code") setEditing(false);
  }, [state]);

  return (
    <form action={action} className="card space-y-3 p-5">
      {/* Campo controlado: React limpia el formulario despues de cada envio y
          en el paso del codigo hay que seguir mandando el mismo correo. */}
      {verifying ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <div>
          <label htmlFor="email" className="text-sm text-white/70">
            Correo con el que te registraste
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            className="field mt-1.5"
            placeholder="tucorreo@ejemplo.com"
            autoComplete="email"
            required
            maxLength={120}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      )}

      {state.notice && !state.error && (
        <p className="rounded-lg border border-success/50 bg-success/15 px-4 py-3 text-sm text-white">
          {state.notice}
        </p>
      )}

      {state.error && (
        <p className="rounded-lg border border-alert/50 bg-alert/15 px-4 py-3 text-sm text-white">
          {state.error}
        </p>
      )}

      {verifying && (
        <div>
          <label htmlFor="verificationCode" className="text-sm text-white/70">
            Código enviado a <span className="font-semibold text-white">{state.email}</span>
          </label>
          <input
            id="verificationCode"
            name="verificationCode"
            className="field mt-1.5 text-center font-mono text-2xl tracking-[0.5em]"
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
          />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/60">
            <ResendButton />
            <button
              type="button"
              className="underline underline-offset-2 hover:text-white"
              onClick={() => setEditing(true)}
            >
              Usar otro correo
            </button>
          </div>
        </div>
      )}

      <input type="hidden" name="stage" value={verifying ? "code" : "email"} />
      <SubmitButton verifying={verifying} />

      <p className="text-center text-xs text-white/50">
        ¿Aún no te registras?{" "}
        <Link href="/#registro" className="underline underline-offset-4 hover:text-white">
          Crear mi pase
        </Link>
      </p>
    </form>
  );
}
