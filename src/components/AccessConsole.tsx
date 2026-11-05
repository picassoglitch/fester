"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Scanner from "@/components/Scanner";
import { recordAccess, type AccessOutcome } from "@/app/actions/access";
import { normalizeCode } from "@/lib/codes";
import type { AccessKindValue } from "@/lib/access";
import {
  playScanFeedback,
  readScanSoundMuted,
  saveScanSoundMuted,
  unlockScanFeedback,
  type ScanTone,
} from "@/lib/scan-feedback";

const KIND_KEY = "fester_acceso";
const AUTO_CLOSE_MS = 1500;
const SAME_CODE_GUARD_MS = 3000;
const NETWORK_ERROR = "Sin conexión con el servidor. Revisa la red e intenta de nuevo.";

type Ok = Extract<AccessOutcome, { ok: true }>;
type Result =
  | { kind: "ok" | "warn" | "confirm"; outcome: Ok; retried?: boolean }
  | { kind: "error"; message: string; retry: string | null; variant: "invalid" | "offline" | "reauth" };

const REASON: Record<"no-aprobado" | "aforo-lleno", string> = {
  "no-aprobado": "No está en la lista de aprobados",
  "aforo-lleno": "El foro está lleno",
};

function toResult(outcome: AccessOutcome, retried: boolean): Result {
  if (!outcome.ok) {
    return { kind: "error", message: outcome.error, retry: null, variant: outcome.reauth ? "reauth" : "invalid" };
  }
  if (outcome.status === "confirmar") return { kind: "confirm", outcome };
  if (outcome.status === "entrada" || outcome.status === "salida") return { kind: "ok", outcome };
  return { kind: "warn", outcome, retried };
}

const TONE: Record<Result["kind"], ScanTone> = { ok: "ok", warn: "warn", confirm: "error", error: "error" };

export default function AccessConsole({
  inside,
  capacity,
  staffName,
  initialKind,
  showStationsLink,
}: {
  inside: number;
  capacity: number;
  staffName: string;
  /** Viene del menu de estaciones (?puerta=): gana sobre lo guardado. */
  initialKind?: AccessKindValue;
  showStationsLink: boolean;
}) {
  const [kind, setKind] = useState<AccessKindValue | null>(null);
  const [count, setCount] = useState(inside);
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState("");
  const [muted, setMuted] = useState(false);
  const inFlight = useRef(false);
  const mutedRef = useRef(false);
  const last = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // El servidor manda el conteo fresco en cada refresh; gana sobre el local.
  useEffect(() => setCount(inside), [inside]);

  useEffect(() => {
    try {
      if (initialKind) localStorage.setItem(KIND_KEY, initialKind);
      const stored = initialKind ?? localStorage.getItem(KIND_KEY);
      if (stored === "ENTRY" || stored === "EXIT") setKind(stored);
    } catch {
      if (initialKind) setKind(initialKind);
    }
    const m = readScanSoundMuted();
    mutedRef.current = m;
    setMuted(m);
    const unlock = () => unlockScanFeedback();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [initialKind]);

  function choose(next: AccessKindValue) {
    setKind(next);
    setResult(null);
    try {
      localStorage.setItem(KIND_KEY, next);
    } catch {
      /* modo privado */
    }
  }

  const submit = useCallback(
    (rawCode: string, override = false, retried = false) => {
      const code = normalizeCode(rawCode);
      if (!code || !kind || inFlight.current) return;
      inFlight.current = true;
      startTransition(async () => {
        let next: Result;
        try {
          const outcome = await recordAccess(code, kind, override);
          next = toResult(outcome, retried);
          if (outcome.ok) {
            setCount(outcome.inside);
            router.refresh();
          }
        } catch {
          next = { kind: "error", message: NETWORK_ERROR, retry: code, variant: "offline" };
        }
        inFlight.current = false;
        last.current = { code, at: Date.now() };
        setResult(next);
        setManual("");
        playScanFeedback(TONE[next.kind], { sound: !mutedRef.current });
      });
    },
    [kind, router],
  );

  const onCamera = useCallback(
    (raw: string) => {
      const code = normalizeCode(raw);
      if (code && last.current.code === code && Date.now() - last.current.at < SAME_CODE_GUARD_MS) return;
      submit(raw);
    },
    [submit],
  );

  useEffect(() => {
    if (!result || result.kind === "error" || result.kind === "confirm") return;
    const timer = setTimeout(() => setResult(null), AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [result]);

  const full = count >= capacity;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`rounded-2xl border p-4 text-center ${full ? "border-brand bg-brand/20" : "border-white/15 bg-navy/60"}`}
        aria-live="polite"
      >
        <p className="text-xs uppercase tracking-widest text-white/60">Dentro del foro</p>
        <p className="font-display text-6xl font-bold leading-none">
          {count}
          <span className="text-2xl text-white/50"> / {capacity}</span>
        </p>
        {full && <p className="mt-1 text-sm font-bold text-alert">Aforo lleno</p>}
      </div>

      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Puerta">
        {(["ENTRY", "EXIT"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => choose(k)}
            className={`rounded-xl border-2 py-4 text-lg font-bold ${
              kind === k
                ? k === "ENTRY"
                  ? "border-success bg-success text-navy"
                  : "border-gold bg-gold text-navy"
                : "border-white/20 text-white/70"
            }`}
          >
            {k === "ENTRY" ? "⬇ Entrada" : "⬆ Salida"}
          </button>
        ))}
      </div>

      {!kind && (
        <p className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-center text-sm text-gold">
          Elige si esta puerta es Entrada o Salida.
        </p>
      )}

      <Scanner onCode={onCamera} paused={pending || result !== null || !kind} />

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(manual);
        }}
      >
        <input
          className="field flex-1 text-center font-mono uppercase tracking-[0.3em]"
          placeholder="Código manual"
          value={manual}
          onChange={(e) => setManual(e.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={12}
        />
        <button type="submit" className="btn btn-ghost px-5" disabled={pending || !kind || manual.length < 4}>
          Ir
        </button>
      </form>

      {pending && (
        <div role="status" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-navy/95">
          <span className="h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-2xl font-bold">Registrando…</p>
        </div>
      )}

      {result && !pending && (
        <AccessResult
          result={result}
          onClose={() => setResult(null)}
          onOverride={(code) => {
            setResult(null);
            submit(code, true);
          }}
          onRetry={(code) => {
            setResult(null);
            submit(code, false, true);
          }}
        />
      )}

      <footer className="flex items-center justify-between pt-2 text-xs text-white/40">
        <span>
          {staffName}
          {kind ? ` · ${kind === "ENTRY" ? "Entrada" : "Salida"}` : ""}
        </span>
        <span className="flex gap-3">
          {muted !== undefined && (
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => {
                const next = !muted;
                mutedRef.current = next;
                setMuted(next);
                saveScanSoundMuted(next);
              }}
            >
              {muted ? "Activar sonido" : "Silenciar"}
            </button>
          )}
          {showStationsLink && (
            <Link href="/staff/escanear" className="underline underline-offset-4">
              Estaciones
            </Link>
          )}
        </span>
      </footer>
    </div>
  );
}

function AccessResult({
  result,
  onClose,
  onOverride,
  onRetry,
}: {
  result: Result;
  onClose: () => void;
  onOverride: (code: string) => void;
  onRetry: (code: string) => void;
}) {
  if (result.kind === "error" && result.variant === "reauth") {
    return (
      <Screen bg="bg-navy text-white" icon="🔒" title="SESIÓN EXPIRADA" subtitle={result.message} onClose={onClose} sticky>
        <a href="/staff?next=/staff/acceso" className="block w-full rounded-xl bg-white py-4 text-lg font-bold text-navy">
          Entrar con PIN
        </a>
      </Screen>
    );
  }
  if (result.kind === "error" && result.variant === "offline") {
    // No es problema del pase: la persona no se rechaza por la red.
    return (
      <Screen bg="bg-[#f59e0b] text-navy" icon="📶" title="SIN CONEXIÓN" subtitle="No es problema del pase. Reintenta." onClose={onClose}>
        {result.retry && (
          <button type="button" className="w-full rounded-xl bg-navy py-4 text-lg font-bold text-white" onClick={() => onRetry(result.retry!)}>
            Reintentar
          </button>
        )}
      </Screen>
    );
  }
  if (result.kind === "error") {
    return (
      <Screen bg="bg-[#c8102e] text-white" icon="✕" title="NO VÁLIDO" subtitle={result.message} onClose={onClose}>
        {result.retry && (
          <button type="button" className="w-full rounded-xl bg-white py-4 text-lg font-bold text-[#c8102e]" onClick={() => onRetry(result.retry!)}>
            Reintentar
          </button>
        )}
      </Screen>
    );
  }
  const { outcome } = result;
  const a = outcome.attendee;
  if (result.kind === "confirm") {
    return (
      <Screen
        bg="bg-[#c8102e] text-white"
        icon="⚠️"
        title="REVISAR"
        subtitle={(outcome.reasons ?? []).map((r) => REASON[r]).join(" · ")}
        attendee={a}
        onClose={onClose}
        closeLabel="No pasa"
        sticky
      >
        <button type="button" className="w-full rounded-xl bg-white py-4 text-lg font-bold text-[#c8102e]" onClick={() => onOverride(a.code)}>
          Dejar pasar
        </button>
      </Screen>
    );
  }
  const look =
    outcome.status === "entrada"
      ? { bg: "bg-[#0f8a4c] text-white", icon: "⬇", title: "BIENVENIDO", subtitle: `Dentro: ${outcome.inside}` }
      : outcome.status === "salida"
        ? { bg: "bg-gold text-navy", icon: "⬆", title: "SALIDA", subtitle: `Dentro: ${outcome.inside}` }
        : result.kind === "warn" && result.retried
          ? { bg: "bg-[#f59e0b] text-navy", icon: "✓", title: "YA REGISTRADO", subtitle: "El intento anterior sí llegó" }
          : outcome.status === "ya-dentro"
          ? { bg: "bg-[#f59e0b] text-navy", icon: "⚠️", title: "YA ESTÁ DENTRO", subtitle: "No se cuenta otra vez" }
          : { bg: "bg-[#f59e0b] text-navy", icon: "⚠️", title: "NO TENÍA ENTRADA", subtitle: "No se descuenta" };
  return <Screen {...look} attendee={a} onClose={onClose} autoClose />;
}

function Screen({
  bg,
  icon,
  title,
  subtitle,
  attendee,
  onClose,
  closeLabel = "Escanear siguiente",
  autoClose = false,
  sticky = false,
  children,
}: {
  bg: string;
  icon: string;
  title: string;
  subtitle: string;
  attendee?: { name: string; code: string; company: string | null; approved: boolean };
  onClose: () => void;
  closeLabel?: string;
  autoClose?: boolean;
  sticky?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={title}
      onClick={sticky ? undefined : onClose}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 pb-48 text-center ${bg}`}
    >
      <div className="animate-scan-in flex flex-col items-center">
        <span aria-hidden className="text-[140px] font-black leading-none">
          {icon}
        </span>
        <p className="mt-4 text-4xl font-black tracking-wide">{title}</p>
        <p className="mt-2 text-xl font-semibold">{subtitle}</p>
        {attendee && (
          <div className="mt-5 space-y-1">
            <p className="text-3xl font-bold">{attendee.name}</p>
            {attendee.company && <p className="text-lg opacity-80">{attendee.company}</p>}
            <p className="font-mono text-sm tracking-[0.3em] opacity-75">{attendee.code}</p>
          </div>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 space-y-3 p-6">
        {children}
        <button
          type="button"
          className="w-full rounded-xl border-2 border-current py-4 text-lg font-bold"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          {closeLabel}
        </button>
        {autoClose && (
          <div className="h-1.5 overflow-hidden rounded-full bg-black/15">
            <div className="h-full origin-left bg-current" style={{ animation: `scan-countdown ${AUTO_CLOSE_MS}ms linear forwards` }} />
          </div>
        )}
      </div>
    </div>
  );
}
