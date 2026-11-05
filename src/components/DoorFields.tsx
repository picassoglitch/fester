"use client";

import { useState } from "react";
import { OTHER_OPTION, POSITIONS } from "@/lib/event";
import type { DoorPassView } from "@/app/actions/door";
import QrCode from "@/components/QrCode";

/** Correo, nombre y puesto. Controlados: React reinicia el form tras la accion y un error borraria lo escrito. */
export function DoorFieldInputs() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [positionOther, setPositionOther] = useState("");
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Correo</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          required
          maxLength={120}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="field"
          placeholder="nombre@correo.com"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Nombre completo</span>
        <input
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="field"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Puesto</span>
        <select
          name="position"
          required
          value={position}
          onChange={(event) => setPosition(event.target.value)}
          className="field"
        >
          <option value="" disabled>
            Selecciona el puesto
          </option>
          {POSITIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        {position === OTHER_OPTION && (
          <input
            name="positionOther"
            required
            minLength={2}
            maxLength={60}
            value={positionOther}
            onChange={(event) => setPositionOther(event.target.value)}
            className="field mt-2"
            placeholder="Escribe el puesto"
            aria-label="Otro puesto"
          />
        )}
      </label>
    </div>
  );
}

/** QR y codigo en grande para que la persona le tome foto. */
export function DoorPassCard({ pass }: { pass: DoorPassView }) {
  return (
    <div className="flex flex-col items-center text-center" data-testid="door-pass">
      <p className="text-xl font-bold">{pass.name}</p>
      <div className="mt-3 w-full max-w-[320px]">
        <QrCode value={pass.qrValue} size={320} className="aspect-square h-auto w-full" />
      </div>
      <p className="mt-3 font-mono text-5xl font-black tracking-[0.25em]">{pass.code}</p>
      <p className="mt-2 text-sm text-white/60">Tómale foto a este código: es tu pase del evento.</p>
      {pass.mailFailed && (
        <p className="mt-2 text-xs text-gold" role="status">
          No pudimos enviar el pase por correo; la foto basta para entrar y escanear estaciones.
        </p>
      )}
    </div>
  );
}
