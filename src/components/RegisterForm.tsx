"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerAttendee, type RegisterState } from "@/app/actions/register";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full text-base" disabled={pending}>
      {pending ? "Creando tu pase…" : "Crear mi pase"}
    </button>
  );
}

export default function RegisterForm() {
  const [state, action] = useActionState<RegisterState, FormData>(registerAttendee, {});

  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm text-white/70">
          Nombre completo
        </label>
        <input
          id="name"
          name="name"
          className="field"
          placeholder="Ana Martínez"
          autoComplete="name"
          required
          maxLength={80}
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm text-white/70">
          Correo <span className="text-white/40">(opcional)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          className="field"
          placeholder="ana@correo.com"
          autoComplete="email"
          maxLength={120}
        />
      </div>

      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm text-white/70">
          Teléfono <span className="text-white/40">(opcional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          className="field"
          placeholder="55 1234 5678"
          autoComplete="tel"
          maxLength={20}
        />
      </div>

      {state.error && (
        <p className="rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="text-center text-xs leading-relaxed text-white/40">
        Guardamos tus datos solo para el seguimiento del evento.
      </p>
    </form>
  );
}
