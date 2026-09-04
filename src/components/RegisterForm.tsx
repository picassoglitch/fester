"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { registerAttendee, type RegisterState } from "@/app/actions/register";
import Icon from "@/components/landing/Icon";
import {
  AGE_LIMITS,
  INDEPENDENT_LABEL,
  INDUSTRIES,
  OTHER_OPTION,
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
 * Lista desplegable de catalogo. Al elegir "Otro" aparece un campo de texto
 * (name = `${name}Other`) para que la persona escriba su respuesta.
 */
function CatalogSelect({
  id,
  name,
  label,
  placeholder,
  options,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  options: readonly string[];
}) {
  const [value, setValue] = useState("");
  const other = value === OTHER_OPTION;

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        name={name}
        className="field-light"
        required
        value={value}
        onChange={(event) => setValue(event.target.value)}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {other && (
        <>
          <label htmlFor={`${id}-other`} className="sr-only">
            {label}: especifica
          </label>
          <input
            id={`${id}-other`}
            name={`${name}Other`}
            className="field-light mt-2"
            placeholder="Escribe tu respuesta*"
            required
            maxLength={60}
            autoFocus
          />
        </>
      )}
    </div>
  );
}

/**
 * Formulario del mockup con los ajustes de marca: nueve campos en tres
 * columnas, opcion de independiente, texto libre al elegir "Otro", aviso de
 * privacidad a la izquierda y el boton rojo a la derecha.
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

        <CatalogSelect
          id="industry"
          name="industry"
          label="Giro de la empresa"
          placeholder="Giro de la empresa*"
          options={INDUSTRIES}
        />

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

        <CatalogSelect
          id="referral"
          name="referral"
          label="¿Cómo te enteraste del evento?"
          placeholder="¿Cómo te enteraste del evento?*"
          options={REFERRAL_SOURCES}
        />

        <CatalogSelect
          id="position"
          name="position"
          label="Puesto o cargo"
          placeholder="Puesto / Cargo*"
          options={POSITIONS}
        />

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
