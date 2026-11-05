"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { admitWalkIn, registerWalkIn, type DoorEntry, type WalkInState } from "@/app/actions/door";
import { DoorFieldInputs, DoorPassCard } from "@/components/DoorFields";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full py-3.5 text-base" disabled={pending}>
      {pending ? "Registrando…" : "Registrar y dar entrada"}
    </button>
  );
}

function EntryStatus({
  entry,
  capacity,
  busy,
  onAdmit,
}: {
  entry: DoorEntry;
  capacity: number;
  busy: boolean;
  onAdmit: (override: boolean) => void;
}) {
  const inside = "inside" in entry && entry.inside !== undefined ? ` · Dentro del foro: ${entry.inside}/${capacity}` : "";
  if (entry.status === "entrada") {
    return <p className="rounded-xl bg-emerald-600/25 p-3 font-bold text-emerald-200">✓ Entrada registrada{inside}</p>;
  }
  if (entry.status === "ya-dentro") {
    return <p className="rounded-xl bg-white/10 p-3 font-bold">Ya estaba dentro del foro{inside}</p>;
  }
  if (entry.status === "confirmar") {
    return (
      <div className="space-y-2 rounded-xl bg-[#c8102e]/30 p-3">
        <p className="font-bold">El foro está lleno{inside}</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAdmit(true)}
          className="w-full rounded-xl bg-white py-3 text-lg font-bold text-[#c8102e]"
        >
          Dejar pasar
        </button>
        <p className="text-xs text-white/70">Si no pasa, el pase queda creado y se le da entrada después en Registro.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-xl bg-[#c8102e]/30 p-3">
      <p className="font-bold">{entry.error}</p>
      <button type="button" disabled={busy} onClick={() => onAdmit(false)} className="btn btn-ghost w-full py-2">
        Reintentar entrada
      </button>
    </div>
  );
}

function WalkInForm({ capacity, onNext }: { capacity: number; onNext: () => void }) {
  const [state, action] = useActionState<WalkInState, FormData>(registerWalkIn, {});
  const [entry, setEntry] = useState<DoorEntry | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  const pass = state.pass;
  // El contador del encabezado viene del servidor: se refresca tras cada registro.
  useEffect(() => {
    if (state.pass) router.refresh();
  }, [state, router]);
  const currentEntry = entry ?? state.entry ?? null;

  function admit(override: boolean) {
    if (!pass) return;
    startTransition(async () => {
      try {
        setEntry(await admitWalkIn(pass.code, override));
      } catch (error) {
        console.error(error);
        setEntry({ status: "error", error: "No se pudo marcar la Entrada. Revisa la conexión o vuelve a iniciar sesión." });
      }
      router.refresh();
    });
  }

  if (pass) {
    return (
      <div className="space-y-4">
        {!pass.created && (
          <p className="rounded-xl bg-gold/15 p-3 text-sm text-gold" role="status">
            Este correo ya tenía pase: es este, no se creó otro.
          </p>
        )}
        <DoorPassCard pass={pass} />
        {currentEntry && <EntryStatus entry={currentEntry} capacity={capacity} busy={busy} onAdmit={admit} />}
        <button type="button" onClick={onNext} className="btn btn-ghost w-full py-3">
          Registrar a otra persona
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <DoorFieldInputs />
      {state.error && (
        <p className="rounded-xl bg-[#c8102e]/25 p-3 text-sm" role="alert">
          {state.error}
        </p>
      )}
      <Submit />
    </form>
  );
}

/** Registro del staff en la puerta. El key reinicia el formulario para la siguiente persona. */
export default function DoorRegister({ capacity }: { capacity: number }) {
  const [round, setRound] = useState(0);
  return <WalkInForm key={round} capacity={capacity} onNext={() => setRound((n) => n + 1)} />;
}
