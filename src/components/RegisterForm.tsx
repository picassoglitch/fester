"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { registerAttendee, type RegisterState } from "@/app/actions/register";
import Icon from "@/components/landing/Icon";
import {
  AGE_LIMITS,
  CONDITIONS,
  INDEPENDENT_LABEL,
  INDUSTRIES,
  POSITIONS,
  REFERRAL_SOURCES,
  STATES,
} from "@/lib/event";

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
 * Formulario del mockup con los ajustes de marca: nueve campos en tres
 * columnas, opcion de independiente, condiciones de acceso antes de enviar,
 * aviso de privacidad a la izquierda y el boton rojo a la derecha.
 */
export default function RegisterForm() {
  const [state, action] = useActionState<RegisterState, FormData>(registerAttendee, {});
  const [independent, setIndependent] = useState(false);

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
            placeholder={independent ? INDEPENDENT_LABEL : "Empresa*"}
            autoComplete="organization"
            required={!independent}
            disabled={independent}
            maxLength={100}
          />
          <label className="mt-1.5 flex items-center gap-2 text-xs text-white/80">
            <input
              type="checkbox"
              name="independent"
              value="on"
              checked={independent}
              onChange={(event) => setIndependent(event.target.checked)}
              className="h-3.5 w-3.5 shrink-0 accent-[#e2001a]"
            />
            Soy independiente / no pertenezco a una empresa
          </label>
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

        <div>
          <label htmlFor="age" className="sr-only">
            Edad
          </label>
          <input
            id="age"
            name="age"
            type="number"
            inputMode="numeric"
            min={AGE_LIMITS.min}
            max={AGE_LIMITS.max}
            className="field-light"
            placeholder="Edad*"
            required
          />
        </div>
      </div>

      {state.error && (
        <p className="rounded-lg border border-alert/50 bg-alert/15 px-4 py-3 text-sm font-medium text-white">
          {state.error}
        </p>
      )}

      <div className="rounded-lg border border-white/15 bg-navy/50 p-5">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gold">
          <Icon name="idcard" className="h-5 w-5" />
          {CONDITIONS.title}
        </h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {CONDITIONS.items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm leading-snug text-white/85">
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-white/80 sm:max-w-md">
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

      <p className="text-xs leading-relaxed text-white/55">
        Al registrarte generamos tu pase con código QR para el acceso y las estaciones del evento.
      </p>
    </form>
  );
}
