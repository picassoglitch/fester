"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerAttendee, type RegisterState } from "@/app/actions/register";
import Icon from "@/components/landing/Icon";
import { INDUSTRIES, POSITIONS, REFERRAL_SOURCES } from "@/lib/event";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn-primary w-full px-7 py-3.5 text-base uppercase tracking-wide sm:w-auto sm:min-w-[16rem]"
      disabled={pending}
    >
      {pending ? "Creando tu pase…" : "Regístrate ahora"}
      {!pending && <Icon name="arrow" className="h-5 w-5" />}
    </button>
  );
}

function Required() {
  return <span className="text-brand">*</span>;
}

/**
 * Formulario del mockup: ocho campos en tres columnas, aviso de privacidad
 * abajo a la izquierda y el boton rojo a la derecha.
 */
export default function RegisterForm() {
  const [state, action] = useActionState<RegisterState, FormData>(registerAttendee, {});

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <label htmlFor="email" className="sr-only">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            className="field-light"
            placeholder="Correo*"
            autoComplete="email"
            required
            maxLength={120}
          />
        </div>

        <div>
          <label htmlFor="referral" className="sr-only">
            ¿Cómo te enteraste del evento?
          </label>
          <select id="referral" name="referral" className="field-light" required defaultValue="">
            <option value="" disabled>
              ¿Cómo te enteraste del evento?*
            </option>
            {REFERRAL_SOURCES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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

        <div>
          <label htmlFor="city" className="sr-only">
            Ciudad
          </label>
          <input
            id="city"
            name="city"
            className="field-light"
            placeholder="Ciudad*"
            autoComplete="address-level2"
            required
            maxLength={80}
          />
        </div>
      </div>

      {state.error && (
        <p className="rounded-lg border border-alert/40 bg-alert/10 px-4 py-3 text-sm text-alert">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-white/75 sm:max-w-md">
          <input
            type="checkbox"
            name="privacy"
            value="on"
            required
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#e2001a]"
          />
          <span>
            Acepto el{" "}
            <a href="#contacto" className="underline underline-offset-2">
              aviso de privacidad
            </a>{" "}
            y el tratamiento de mis datos personales. <Required />
          </span>
        </label>

        <SubmitButton />
      </div>

      <p className="text-xs leading-relaxed text-white/45">
        Al registrarte generamos tu pase con código QR para el acceso y las estaciones del evento.
      </p>
    </form>
  );
}
