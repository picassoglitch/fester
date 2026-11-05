"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Scanner from "@/components/Scanner";
import { recordScan, redeemPrize, type ScanOutcome } from "@/app/actions/scan";
import type { StaffAttendeeProgress } from "@/lib/attendee";
import type { BraceletColor } from "@/lib/bracelet";
import { normalizeCode } from "@/lib/codes";
import {
  playScanFeedback,
  readScanSoundMuted,
  saveScanSoundMuted,
  unlockScanFeedback,
  type ScanTone,
} from "@/lib/scan-feedback";

type Station = { id: string; name: string; emoji: string };
type Mode = "estacion" | "premio";

/** Lo que ve el staff a pantalla completa despues de cada escaneo. */
type Result =
  | {
      kind: "star" | "complete" | "prize" | "warn" | "entry" | "exit" | "confirm";
      outcome: Extract<ScanOutcome, { ok: true }>;
    }
  | { kind: "error"; message: string; retryCode: string | null };

const STATION_KEY = "fester_station";

/** El mismo QR frente a la camara no vuelve a contar durante este tiempo. */
export const SAME_CODE_GUARD_MS = 3000;
const NETWORK_ERROR = "Sin conexión con el servidor. Revisa la red e intenta de nuevo.";

function resultOf(outcome: ScanOutcome, mode: Mode): Result {
  if (!outcome.ok) return { kind: "error", message: outcome.error, retryCode: null };
  if (outcome.status === "confirmar") return { kind: "confirm", outcome };
  if (outcome.status === "entrada") return { kind: "entry", outcome };
  if (outcome.status === "salida") return { kind: "exit", outcome };
  if (outcome.status === "nuevo") return { kind: "star", outcome };
  if (outcome.status === "premio") return { kind: mode === "premio" ? "prize" : "complete", outcome };
  return { kind: "warn", outcome };
}

const TONE: Record<Result["kind"], ScanTone> = {
  star: "ok",
  complete: "prize",
  prize: "prize",
  warn: "warn",
  entry: "ok",
  exit: "ok",
  confirm: "error",
  error: "error",
};

const REASONS: Record<string, string> = {
  "aforo-lleno": "El foro está lleno",
};

export default function ScanConsole({
  stations,
  staffName,
  mode,
  initialCode,
  showModeLink = false,
  inside,
  capacity,
}: {
  stations: Station[];
  staffName: string;
  mode: Mode;
  initialCode?: string;
  /** Personas dentro del foro: se ve en todas las estaciones (junta Fester 2026-11-04). */
  inside?: number;
  capacity?: number;
  /** Liga a la otra pantalla (estaciones/premios): solo el admin abre las dos. */
  showModeLink?: boolean;
}) {
  const [stationId, setStationId] = useState<string>("");
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState("");
  const [muted, setMuted] = useState(false);
  // Codigo que llego por /s/CODE: se precarga y espera confirmacion explicita.
  const [loadedCode, setLoadedCode] = useState<string | null>(null);
  const prefilled = useRef<string | null>(null);
  const manualRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  // Un escaneo a la vez: un segundo toque mientras el servidor responde no sale.
  const inFlight = useRef(false);
  const lastResult = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const mutedRef = useRef(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [count, setCount] = useState(inside);
  // El refresh del servidor trae el conteo de todas las puertas.
  useEffect(() => setCount(inside), [inside]);

  useEffect(() => {
    if (mode !== "estacion" || stations.length === 0) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STATION_KEY);
    } catch {
      /* modo privado */
    }
    // Sin estacion guardada no se elige una por defecto: hay que escogerla.
    const valid = stations.find((s) => s.id === stored);
    if (valid) setStationId(valid.id);
  }, [mode, stations]);

  useEffect(() => {
    const stored = readScanSoundMuted();
    mutedRef.current = stored;
    setMuted(stored);
  }, []);

  // Lo que se tecleo en "Código manual" antes de hidratar no paso por onChange:
  // el estado seguia vacio, "Ir" deshabilitado y el siguiente render borraba el
  // campo, asi que el primer intento se perdia. Se toma del DOM al montar.
  useEffect(() => {
    const typed = manualRef.current?.value;
    if (typed) setManual(typed.toUpperCase());
  }, []);

  // El navegador solo deja sonar el pitido despues de un toque o tecla.
  useEffect(() => {
    const unlock = () => unlockScanFeedback();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Pantalla siempre encendida mientras se escanea (donde el navegador lo soporta).
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    async function acquire() {
      try {
        const next = await navigator.wakeLock?.request("screen");
        if (cancelled) void next?.release();
        else lock = next ?? null;
      } catch {
        /* sin wake lock o bateria baja */
      }
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  const needsStation = mode === "estacion" && !stationId;
  const activeStation = stations.find((s) => s.id === stationId);

  const submit = useCallback(
    (rawCode: string, override = false) => {
      const code = normalizeCode(rawCode);
      if (!code || inFlight.current) return;
      if (mode === "estacion" && !stationId) return;
      inFlight.current = true;
      startTransition(async () => {
        let next: Result;
        try {
          const outcome =
            mode === "premio" ? await redeemPrize(code) : await recordScan(code, stationId, override);
          next = resultOf(outcome, mode);
          if (outcome.ok && outcome.inside !== undefined) setCount(outcome.inside);
          // Refresca los contadores del servidor; el resultado vive aqui y no se pierde.
          if (outcome.ok) router.refresh();
        } catch {
          next = { kind: "error", message: NETWORK_ERROR, retryCode: code };
        }
        inFlight.current = false;
        lastResult.current = { code, at: Date.now() };
        setResult(next);
        setManual("");
        playScanFeedback(TONE[next.kind], { sound: !mutedRef.current });
      });
    },
    [mode, stationId, router],
  );

  // La camara: el mismo QR sostenido no vuelve a contar hasta pasados 3 s.
  const closeResult = useCallback(() => {
    // El guard del mismo QR cuenta desde que se cierra: el pase puede seguir frente a la cámara.
    lastResult.current = { ...lastResult.current, at: Date.now() };
    setResult(null);
  }, []);

  const onCameraCode = useCallback(
    (rawCode: string) => {
      const code = normalizeCode(rawCode);
      const last = lastResult.current;
      if (code && last.code === code && Date.now() - last.at < SAME_CODE_GUARD_MS) return;
      submit(rawCode);
    },
    [submit],
  );

  // Llegar con ?code= solo precarga el pase (una vez por codigo). Antes se
  // registraba solo y cada cambio de estacion volvia a sumar una estrella.
  useEffect(() => {
    if (!initialCode || prefilled.current === initialCode) return;
    prefilled.current = initialCode;
    setLoadedCode(initialCode);
  }, [initialCode]);

  const clearCodeFromUrl = useCallback(() => {
    if (initialCode) router.replace(mode === "premio" ? "/staff/premios" : "/staff/escanear");
  }, [initialCode, mode, router]);

  function confirmLoaded() {
    if (!loadedCode) return;
    submit(loadedCode);
    setLoadedCode(null);
    clearCodeFromUrl();
  }

  function chooseStation(id: string) {
    setStationId(id);
    try {
      localStorage.setItem(STATION_KEY, id);
    } catch {
      /* modo privado */
    }
  }

  function toggleMuted() {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    saveScanSoundMuted(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-30 -mx-4 flex items-center gap-3 border-b border-white/10 bg-ink/95 px-4 py-2.5 backdrop-blur">
        <p className="min-w-0 flex-1 truncate text-sm">
          {mode === "premio" ? (
            <span className="font-semibold">🎁 Entrega de premios</span>
          ) : activeStation ? (
            <>
              <span className="text-white/60">Estación: </span>
              <span className="font-semibold">
                {activeStation.emoji} {activeStation.name}
              </span>
            </>
          ) : (
            <span className="font-semibold text-gold">Sin estación</span>
          )}
        </p>
        {count !== undefined && capacity !== undefined && (
          <span
            aria-label={`Dentro del foro: ${count} de ${capacity}`}
            className={`rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${
              count >= capacity ? "bg-brand text-white" : "bg-white/10"
            }`}
          >
            Foro {count}/{capacity}
          </span>
        )}
        <button
          type="button"
          onClick={toggleMuted}
          className="rounded-lg border border-white/15 px-2.5 py-1 text-base"
          aria-label={muted ? "Activar sonido" : "Silenciar"}
          aria-pressed={muted}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        {mode === "estacion" && (
          <button
            type="button"
            className="text-xs text-white/70 underline underline-offset-4"
            onClick={() => {
              selectRef.current?.scrollIntoView?.({ block: "center" });
              selectRef.current?.focus();
            }}
          >
            Cambiar
          </button>
        )}
      </div>

      {mode === "estacion" && (
        <div>
          <label htmlFor="station" className="mb-1.5 block text-sm text-white/60">
            Estación asignada
          </label>
          <select
            id="station"
            ref={selectRef}
            className="field appearance-none"
            value={stationId}
            onChange={(event) => {
              chooseStation(event.target.value);
              // Cambiar de estacion descarta el pase cargado: no se registra nada.
              setLoadedCode(null);
              setResult(null);
              setManual("");
              clearCodeFromUrl();
            }}
          >
            {!stationId && (
              <option value="" disabled className="bg-ink">
                Elige tu estación
              </option>
            )}
            {stations.map((station) => (
              <option key={station.id} value={station.id} className="bg-ink">
                {station.emoji} {station.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {needsStation && (
        <p className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-center text-sm text-gold">
          Elige tu estación antes de escanear.
        </p>
      )}

      <Scanner
        onCode={onCameraCode}
        paused={pending || result !== null || loadedCode !== null || needsStation}
      />

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit(manual);
        }}
      >
        <input
          ref={manualRef}
          className="field flex-1 text-center font-mono uppercase tracking-[0.3em]"
          placeholder="Código manual"
          value={manual}
          onChange={(event) => setManual(event.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={12}
        />
        <button
          type="submit"
          className="btn btn-ghost px-5"
          disabled={pending || needsStation || manual.length < 4}
        >
          Ir
        </button>
      </form>

      {loadedCode && !result && !pending && (
        <div
          role="dialog"
          aria-label="Pase cargado"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-navy px-6 text-center"
        >
          <p className="text-lg text-white/70">Pase cargado</p>
          <p className="font-mono text-5xl font-bold tracking-[0.25em]">{loadedCode}</p>
          {needsStation && (
            // La hoja tapa el selector de arriba: sin estacion guardada se elige aqui
            // mismo, sin perder el pase cargado.
            <div className="w-full max-w-sm text-left">
              <label htmlFor="sheet-station" className="mb-1.5 block text-sm text-gold">
                Elige tu estación para registrar este pase
              </label>
              <select
                id="sheet-station"
                className="field appearance-none"
                value=""
                onChange={(event) => chooseStation(event.target.value)}
              >
                <option value="" disabled className="bg-ink">
                  Elige tu estación
                </option>
                {stations.map((station) => (
                  <option key={station.id} value={station.id} className="bg-ink">
                    {station.emoji} {station.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary w-full max-w-sm py-5 text-lg"
            disabled={pending || needsStation}
            onClick={confirmLoaded}
          >
            {mode === "premio"
              ? "Entregar premio"
              : activeStation
                ? `Registrar estrella en ${activeStation.name}`
                : "Elige tu estación"}
          </button>
          <button
            type="button"
            className="text-base text-white/60 underline underline-offset-4"
            onClick={() => {
              setLoadedCode(null);
              clearCodeFromUrl();
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {pending && (
        <div
          role="status"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-navy/95 text-center"
        >
          <span className="h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-2xl font-bold">Registrando…</p>
        </div>
      )}

      {result && !pending && (
        <ResultScreen
          result={result}
          stationName={activeStation?.name}
          onClose={closeResult}
          onRetry={(code) => {
            setResult(null);
            submit(code);
          }}
          onOverride={(code) => {
            setResult(null);
            submit(code, true);
          }}
        />
      )}

      <footer className="flex items-center justify-between pt-2 text-xs text-white/40">
        <span>
          {staffName}
          {mode === "estacion" && activeStation ? ` · ${activeStation.name}` : ""}
        </span>
        {showModeLink && (
          <Link
            href={mode === "premio" ? "/staff/escanear" : "/staff/premios"}
            className="underline underline-offset-4"
          >
            {mode === "premio" ? "Ir a estaciones" : "Entregar premios"}
          </Link>
        )}
      </footer>
    </div>
  );
}

// Color + icono + palabra: se entiende a un brazo de distancia y sin depender del color.
const SCREEN: Record<Result["kind"], { bg: string; text: string; icon: string; title: string }> = {
  star: { bg: "bg-[#0f8a4c]", text: "text-white", icon: "✓", title: "¡LISTO!" },
  complete: { bg: "bg-gold", text: "text-navy", icon: "🎉", title: "¡RECORRIDO COMPLETO!" },
  prize: { bg: "bg-[#0f8a4c]", text: "text-white", icon: "🎁", title: "PREMIO ENTREGADO" },
  warn: { bg: "bg-[#f59e0b]", text: "text-navy", icon: "⚠️", title: "YA REGISTRADO" },
  entry: { bg: "bg-[#0f8a4c]", text: "text-white", icon: "⬇", title: "BIENVENIDO" },
  exit: { bg: "bg-gold", text: "text-navy", icon: "⬆", title: "SALIDA" },
  confirm: { bg: "bg-[#c8102e]", text: "text-white", icon: "⚠️", title: "REVISAR" },
  error: { bg: "bg-[#c8102e]", text: "text-white", icon: "✕", title: "NO VÁLIDO" },
};

const BRACELET_LOOK: Record<BraceletColor, string> = {
  ROJO: "bg-[#c8102e] text-white",
  BLANCO: "bg-white text-navy ring-4 ring-navy/20",
  AZUL: "bg-[#0057b8] text-white",
};

function BraceletCard({ attendee }: { attendee: StaffAttendeeProgress }) {
  const { bracelet } = attendee;
  const details = [
    ["Perfil", attendee.festerProfile],
    ["Empresa", attendee.company],
    ["Puesto", attendee.position],
    ["Estado", attendee.state],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <div className="mt-3 w-full overflow-hidden rounded-2xl bg-white text-left text-navy shadow-xl" data-bracelet={bracelet?.color ?? "SIN"}>
      {bracelet ? (
        <div className={`px-5 py-4 text-center ${BRACELET_LOOK[bracelet.color]}`}>
          <p className="text-xs font-bold tracking-[0.3em] opacity-80">BRAZALETE</p>
          <p className="text-4xl font-black tracking-wide">{bracelet.color}</p>
          <p className="text-lg font-semibold">{bracelet.category}</p>
          {bracelet.source === "puesto" && <p className="text-xs font-semibold opacity-80">Según su puesto (no viene en la lista de Fester)</p>}
        </div>
      ) : (
        <div className="bg-neutral-200 px-5 py-4 text-center text-navy">
          <p className="text-xs font-bold tracking-[0.3em] opacity-70">BRAZALETE</p>
          <p className="text-2xl font-black">REVISAR PERFIL</p>
          <p className="text-sm font-semibold">
            {attendee.festerProfile ? "Perfil fuera de la tabla de Fester" : "Sin perfil en la base de Fester"}
          </p>
        </div>
      )}
      {details.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-5 py-3 text-sm">
          {details.map(([label, value]) => (
            <Fragment key={label}>
              <dt className="font-semibold text-navy/60">{label}</dt>
              <dd className="font-semibold">{value}</dd>
            </Fragment>
          ))}
        </dl>
      )}
    </div>
  );
}

function ResultScreen({
  result,
  stationName,
  onClose,
  onRetry,
  onOverride,
}: {
  result: Result;
  stationName?: string;
  onClose: () => void;
  onRetry: (code: string) => void;
  onOverride: (code: string) => void;
}) {
  const look = SCREEN[result.kind];
  const attendee = result.kind === "error" ? null : result.outcome.attendee;
  const retryCode = result.kind === "error" ? result.retryCode : null;

  let subtitle: string;
  if (result.kind === "error") subtitle = result.message;
  else if (result.kind === "star") subtitle = "Estrella registrada";
  else if (result.kind === "complete") subtitle = "Mándalo a Premios";
  else if (result.kind === "prize") subtitle = `Premio entregado a ${result.outcome.attendee.name}`;
  else if (result.kind === "confirm") subtitle = (result.outcome.reasons ?? []).map((r) => REASONS[r]).join(" · ");
  else if (result.kind === "entry" || result.kind === "exit") subtitle = `Dentro del foro: ${result.outcome.inside}`;
  else subtitle = result.outcome.message;

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={look.title}
      data-result={result.kind}
      // Aldo 2026-11-05 — no se cierra solo ni con un toque: el staff lee el brazalete y cierra con el botón.
      className={`fixed inset-0 z-50 flex flex-col text-center ${look.bg} ${look.text}`}
    >
      {/* Contenido con scroll y botones fijos abajo: en teléfonos chicos el brazalete no queda tapado. */}
      <div className="flex flex-1 flex-col items-center overflow-y-auto px-6 pt-6">
        <div className="animate-scan-in my-auto flex w-full max-w-md flex-col items-center pb-4">
        <span aria-hidden className={`${attendee ? "text-[56px]" : "text-[160px]"} font-black leading-none`}>
          {look.icon}
        </span>
        <p className={`mt-2 font-black tracking-wide ${attendee ? "text-3xl" : "text-4xl"}`}>{look.title}</p>
        <p className={`mt-1 font-semibold ${attendee ? "text-base" : "text-xl"}`}>{subtitle}</p>

        {attendee && (
          <div className="mt-3 w-full space-y-1">
            {result.kind !== "prize" && <p className="text-2xl font-bold">{attendee.name}</p>}
            <p className="font-mono text-sm tracking-[0.3em] opacity-75">{attendee.code}</p>
            <BraceletCard attendee={attendee} />
            <p className="pt-3 text-xl font-bold">
              {result.kind === "star" && stationName ? `${stationName} · ` : ""}
              {attendee.stars} de {attendee.total} ★
            </p>
          </div>
        )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-md shrink-0 space-y-3 px-6 pb-6 pt-3">
        {result.kind === "confirm" && attendee && (
          <button
            type="button"
            className="w-full rounded-xl bg-white py-4 text-lg font-bold text-[#c8102e]"
            onClick={(event) => {
              event.stopPropagation();
              onOverride(attendee.code);
            }}
          >
            Dejar pasar
          </button>
        )}
        {retryCode && (
          <button
            type="button"
            className="w-full rounded-xl bg-white py-4 text-lg font-bold text-[#c8102e]"
            onClick={(event) => {
              event.stopPropagation();
              onRetry(retryCode);
            }}
          >
            Reintentar
          </button>
        )}
        <button
          type="button"
          className="w-full rounded-xl border-2 border-current py-4 text-lg font-bold"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          {result.kind === "confirm" ? "No pasa" : "Escanear siguiente"}
        </button>
      </div>
    </div>
  );
}
