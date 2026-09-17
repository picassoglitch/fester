"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  accessAccount,
  openPassWithCode,
  type AccountState,
  type PassCodeState,
} from "@/app/actions/account";

/**
 * `secondary` se usa cuando el correo no tiene registro: ahi el boton rojo es
 * el de crear el pase y este queda para reintentar con otro correo.
 */
function SubmitButton({ children, secondary }: { children: string; secondary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`btn w-full ${secondary ? "btn-ghost" : "btn-primary"}`}
      disabled={pending}
    >
      {pending ? "Un momento…" : children}
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

function Notice({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  const style =
    tone === "ok" ? "border-success/50 bg-success/15" : "border-alert/50 bg-alert/15";
  return <div className={`rounded-lg border ${style} px-4 py-3 text-sm text-white`}>{children}</div>;
}

const TABS = [
  { key: "email", label: "Con mi correo" },
  { key: "code", label: "Con mi código" },
] as const;

type Tab = (typeof TABS)[number]["key"];

/**
 * Dos formas de volver al pase:
 *
 * - Con el correo del registro: llega un codigo de 6 digitos y se abre sesion.
 *   Si el correo no tiene registro, la pantalla lleva a crear el pase.
 * - Con el codigo del pase (el que aparece bajo el QR): entra directo, para
 *   quien trae el pase a la mano y no quiere esperar un correo.
 */
export default function AccountLogin() {
  const [tab, setTab] = useState<Tab>("email");

  const [state, action] = useActionState<AccountState, FormData>(accessAccount, {});
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const verifying = state.stage === "code" && !editing;

  const [codeState, codeAction] = useActionState<PassCodeState, FormData>(openPassWithCode, {});
  const [passCode, setPassCode] = useState("");

  useEffect(() => {
    if (state.stage === "code") setEditing(false);
  }, [state]);

  return (
    <div className="space-y-3">
      {/* A media verificacion el cambio de pestana solo confundiria. */}
      {!verifying && (
        <div className="flex gap-1 rounded-full border border-white/12 p-1">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                tab === item.key ? "bg-brand text-white" : "text-white/60 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {tab === "email" || verifying ? (
        <form action={action} className="card space-y-3 p-5">
          {/* Campo controlado: React limpia el formulario despues de cada envio
              y en el paso del codigo hay que seguir mandando el mismo correo. */}
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

          {state.notice && !state.error && <Notice tone="ok">{state.notice}</Notice>}

          {state.error && (
            <Notice tone="error">
              {state.error}
              {state.notFound && (
                <>
                  {" "}
                  Regístrate y te generamos tu pase con QR en un minuto.
                  <Link href="/#registro" className="btn btn-primary mt-3 w-full">
                    Crear mi pase
                  </Link>
                </>
              )}
            </Notice>
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
          <SubmitButton secondary={state.notFound}>
            {verifying ? "Entrar a mi cuenta" : state.notFound ? "Probar con otro correo" : "Enviarme un código"}
          </SubmitButton>

          {!state.notFound && (
            <p className="text-center text-xs text-white/50">
              ¿Aún no te registras?{" "}
              <Link href="/#registro" className="underline underline-offset-4 hover:text-white">
                Crear mi pase
              </Link>
            </p>
          )}
        </form>
      ) : (
        <form action={codeAction} className="card space-y-3 p-5">
          <div>
            <label htmlFor="code" className="text-sm text-white/70">
              Código de tu pase
            </label>
            <input
              id="code"
              name="code"
              className="field mt-1.5 text-center font-mono text-2xl uppercase tracking-[0.4em]"
              placeholder="ABC123"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={12}
              required
              value={passCode}
              onChange={(event) => setPassCode(event.target.value.toUpperCase())}
            />
            <p className="mt-1.5 text-xs text-white/50">
              Es el código que aparece debajo del QR, en tu pase y en el correo de confirmación.
            </p>
          </div>

          {codeState.error && <Notice tone="error">{codeState.error}</Notice>}

          <SubmitButton>Ver mi pase</SubmitButton>

          <p className="text-center text-xs text-white/50">
            ¿No lo encuentras?{" "}
            <button
              type="button"
              onClick={() => setTab("email")}
              className="underline underline-offset-4 hover:text-white"
            >
              Entra con tu correo
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
