"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerAttendee, type RegisterState } from "@/app/actions/register";
import { INDUSTRIES, POSITIONS, STATES } from "@/lib/event";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn-primary w-full text-base uppercase tracking-wide"
      disabled={pending}
    >
      {pending ? "Creando tu pase…" : "Regístrate ahora"}
      {!pending && <span aria-hidden>→</span>}
    </button>
  );
}

function Required() {
  return <span className="text-brand">*</span>;
}

export default function RegisterForm() {
  const [state, action] = useActionState<RegisterState, FormData>(registerAttendee, {});

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="sr-only">
            Nombre completo
          </label>
          <input
            id="name"
            name="name"
            className="field-light"
            placeholder="Nombre completo*"
            autoComplete="name"
            required
            maxLength={80}
          />
        </div>

        <div>
          <label htmlFor="company" className="sr-only">
            Empresa
          </label>
          <input
            id="company"
            name="company"
            className="field-light"
            placeholder="Empresa*"
            autoComplete="organization"
            required
            maxLength={100}
          />
        </div>

        <div>
          <label htmlFor="email" className="sr-only">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            className="field-light"
            placeholder="Correo electrónico*"
            autoComplete="email"
            required
            maxLength={120}
          />
        </div>

        <div>
          <label htmlFor="phone" className="sr-only">
            Teléfono
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            className="field-light"
            placeholder="Teléfono*"
            autoComplete="tel"
            required
            maxLength={20}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="position" className="sr-only">
            Puesto o cargo
          </label>
          <select id="position" name="position" className="field-light" required defaultValue="">
            <option value="" disabled>
              Puesto / Cargo*
            </option>
            {POSITIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="industry" className="sr-only">
            Giro de la empresa
          </label>
          <select id="industry" name="industry" className="field-light" required defaultValue="">
            <option value="" disabled>
              Giro de la empresa*
            </option>
            {INDUSTRIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="state" className="sr-only">
            Estado
          </label>
          <select id="state" name="state" className="field-light" required defaultValue="">
            <option value="" disabled>
              Estado*
            </option>
            {STATES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-start gap-2.5 pt-1 text-xs leading-relaxed text-white/70">
        <input
          type="checkbox"
          name="privacy"
          value="on"
          required
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#e2001a]"
        />
        <span>
          Acepto el <span className="underline underline-offset-2">aviso de privacidad</span> y el
          tratamiento de mis datos personales. <Required />
        </span>
      </label>

      {state.error && (
        <p className="rounded-lg border border-alert/40 bg-alert/10 px-4 py-3 text-sm text-alert">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="text-center text-xs leading-relaxed text-white/45">
        Al registrarte generamos tu pase con código QR para el acceso y las estaciones del evento.
      </p>
    </form>
  );
}
