"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { registerAttendee, type RegisterState } from "@/app/actions/register";
import Icon from "@/components/landing/Icon";
import {
  AGE_LIMITS,
  INDEPENDENT_LABEL,
  INDUSTRIES,
  OTHER_OPTION,
  POSITIONS,
  PRIVACY_PATH,
  REFERRAL_SOURCES,
  STATES,
} from "@/lib/event";

function SubmitButton({ verifying }: { verifying: boolean }) {
  const { pending } = useFormStatus();
  const idle = verifying ? "Confirmar y crear mi pase" : "Regístrate ahora";
  const busy = verifying ? "Validando tu código…" : "Enviando tu código…";
  return (
    <button
      type="submit"
      className="btn btn-primary w-full px-7 py-3.5 text-base uppercase tracking-wide sm:w-auto sm:min-w-[16rem]"
      disabled={pending}
    >
      {pending ? busy : idle}
      {!pending && <Icon name="arrow" className="h-5 w-5" />}
    </button>
  );
}

/** Boton de "reenviar": manda intent=resend porque el submit lleva su name. */
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
  value,
  other,
  onValueChange,
  onOtherChange,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  options: readonly string[];
  value: string;
  other: string;
  onValueChange: (value: string) => void;
  onOtherChange: (value: string) => void;
}) {
  const showOther = value === OTHER_OPTION;

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
        onChange={(event) => onValueChange(event.target.value)}
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
      {showOther && (
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
            value={other}
            onChange={(event) => onOtherChange(event.target.value)}
          />
        </>
      )}
    </div>
  );
}

type Values = {
  name: string;
  company: string;
  independent: boolean;
  industry: string;
  industryOther: string;
  email: string;
  phone: string;
  referral: string;
  referralOther: string;
  position: string;
  positionOther: string;
  state: string;
  age: string;
  privacy: boolean;
};

const EMPTY_VALUES: Values = {
  name: "",
  company: "",
  independent: false,
  industry: "",
  industryOther: "",
  email: "",
  phone: "",
  referral: "",
  referralOther: "",
  position: "",
  positionOther: "",
  state: "",
  age: "",
  privacy: false,
};

/**
 * Formulario del mockup con los ajustes de marca: nueve campos en tres
 * columnas, opcion de independiente, texto libre al elegir "Otro", aviso de
 * privacidad a la izquierda y el boton rojo a la derecha.
 *
 * Los campos son controlados a proposito: React limpia los formularios sin
 * control despues de cada server action, y el paso 2 (el codigo del correo)
 * reenvia los mismos datos, asi que tienen que sobrevivir al envio.
 */
export default function RegisterForm() {
  const [state, action] = useActionState<RegisterState, FormData>(registerAttendee, {});
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  // "Editar mis datos" regresa al paso 1 sin perder lo capturado.
  const [editing, setEditing] = useState(false);
  const verifying = state.stage === "verify" && !editing;

  // Cada respuesta del servidor manda un objeto nuevo: al llegar al paso 2 se
  // cierra la edicion para que se vea el campo del codigo.
  useEffect(() => {
    if (state.stage === "verify") setEditing(false);
  }, [state]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form action={action} className="space-y-5">
      {verifying ? (
        // En el paso 2 los datos viajan como campos ocultos: el navegador no
        // valida un input oculto y el servidor los revisa otra vez.
        <>
          <input type="hidden" name="name" value={values.name} />
          {values.independent ? (
            <input type="hidden" name="independent" value="on" />
          ) : (
            <input type="hidden" name="company" value={values.company} />
          )}
          <input type="hidden" name="industry" value={values.industry} />
          <input type="hidden" name="industryOther" value={values.industryOther} />
          <input type="hidden" name="email" value={values.email} />
          <input type="hidden" name="phone" value={values.phone} />
          <input type="hidden" name="referral" value={values.referral} />
          <input type="hidden" name="referralOther" value={values.referralOther} />
          <input type="hidden" name="position" value={values.position} />
          <input type="hidden" name="positionOther" value={values.positionOther} />
          <input type="hidden" name="state" value={values.state} />
          <input type="hidden" name="age" value={values.age} />
          {values.privacy && <input type="hidden" name="privacy" value="on" />}
        </>
      ) : (
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
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
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
              placeholder={values.independent ? INDEPENDENT_LABEL : "Empresa*"}
              autoComplete="organization"
              required={!values.independent}
              disabled={values.independent}
              maxLength={100}
              value={values.independent ? "" : values.company}
              onChange={(event) => set("company", event.target.value)}
            />
            <label className="mt-1.5 flex items-center gap-2 text-xs text-white/80">
              <input
                type="checkbox"
                name="independent"
                value="on"
                checked={values.independent}
                onChange={(event) => set("independent", event.target.checked)}
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
            value={values.industry}
            other={values.industryOther}
            onValueChange={(value) => set("industry", value)}
            onOtherChange={(value) => set("industryOther", value)}
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
              value={values.email}
              onChange={(event) => set("email", event.target.value)}
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
              value={values.phone}
              onChange={(event) => set("phone", event.target.value)}
            />
          </div>

          <CatalogSelect
            id="referral"
            name="referral"
            label="¿Cómo te enteraste del evento?"
            placeholder="¿Cómo te enteraste del evento?*"
            options={REFERRAL_SOURCES}
            value={values.referral}
            other={values.referralOther}
            onValueChange={(value) => set("referral", value)}
            onOtherChange={(value) => set("referralOther", value)}
          />

          <CatalogSelect
            id="position"
            name="position"
            label="Puesto o cargo"
            placeholder="Puesto / Cargo*"
            options={POSITIONS}
            value={values.position}
            other={values.positionOther}
            onValueChange={(value) => set("position", value)}
            onOtherChange={(value) => set("positionOther", value)}
          />

          <div>
            <label htmlFor="state" className="sr-only">
              Estado
            </label>
            <select
              id="state"
              name="state"
              className="field-light"
              required
              value={values.state}
              onChange={(event) => set("state", event.target.value)}
            >
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
              value={values.age}
              onChange={(event) => set("age", event.target.value)}
            />
          </div>
        </div>
      )}

      {state.notice && !state.error && (
        <p className="rounded-lg border border-success/50 bg-success/15 px-4 py-3 text-sm font-medium text-white">
          {state.notice}
        </p>
      )}

      {state.error && (
        <p className="rounded-lg border border-alert/50 bg-alert/15 px-4 py-3 text-sm font-medium text-white">
          {state.error}
        </p>
      )}

      {/* Paso 2: sin el codigo del correo no se crea el pase. */}
      {verifying && (
        <div className="rounded-2xl border border-white/20 bg-white/5 p-5">
          <h3 className="font-display text-base font-semibold uppercase tracking-wide text-white">
            Confirma tu correo
          </h3>
          <p className="mt-1.5 text-sm text-white/75">
            Enviamos un código de 6 dígitos a{" "}
            <span className="font-semibold text-white">{state.email}</span>. Escríbelo aquí para
            generar tu pase. Si no lo ves, revisa tu carpeta de spam o promociones.
          </p>
          <label htmlFor="verificationCode" className="sr-only">
            Código de verificación
          </label>
          <input
            id="verificationCode"
            name="verificationCode"
            className="field-light mt-4 max-w-[16rem] text-center font-mono text-2xl tracking-[0.5em]"
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
          />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/70">
            <ResendButton />
            <button
              type="button"
              className="underline underline-offset-2 hover:text-white"
              onClick={() => setEditing(true)}
            >
              Editar mis datos
            </button>
          </div>
        </div>
      )}

      <input type="hidden" name="stage" value={verifying ? "verify" : "form"} />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {!verifying && (
          <label className="flex items-start gap-2.5 text-xs leading-relaxed text-white/80 sm:max-w-md">
            <input
              type="checkbox"
              name="privacy"
              value="on"
              required
              checked={values.privacy}
              onChange={(event) => set("privacy", event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#e2001a]"
            />
            <span>
              Acepto el{" "}
              <a
                href={PRIVACY_PATH}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                aviso de privacidad
              </a>{" "}
              y el tratamiento de mis datos personales. <Required />
            </span>
          </label>
        )}

        <SubmitButton verifying={verifying} />
      </div>

      <p className="text-xs leading-relaxed text-white/55">
        Validamos tu correo con un código antes de crear tu pase con QR: así llega a la bandeja
        correcta y nadie se registra con un correo ajeno.{" "}
        <Link href="/mi-cuenta" className="underline underline-offset-2 hover:text-white">
          ¿Ya te registraste? Entra a tu cuenta
        </Link>
        .
      </p>
    </form>
  );
}
