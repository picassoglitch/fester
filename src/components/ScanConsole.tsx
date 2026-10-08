"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Scanner from "@/components/Scanner";
import { recordScan, redeemPrize, type ScanOutcome } from "@/app/actions/scan";
import { normalizeCode } from "@/lib/codes";

type Station = { id: string; name: string; emoji: string };
type Mode = "estacion" | "premio";

const STATION_KEY = "fester_station";

export default function ScanConsole({
  stations,
  staffName,
  mode,
  initialCode,
  showModeLink = false,
}: {
  stations: Station[];
  staffName: string;
  mode: Mode;
  initialCode?: string;
  /** Liga a la otra pantalla (estaciones/premios): solo el admin abre las dos. */
  showModeLink?: boolean;
}) {
  const [stationId, setStationId] = useState<string>("");
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [manual, setManual] = useState("");
  // Codigo que llego por /s/CODE: se precarga y espera confirmacion explicita.
  const [loadedCode, setLoadedCode] = useState<string | null>(null);
  const prefilled = useRef<string | null>(null);
  const manualRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

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

  // Lo que se tecleo en "Código manual" antes de hidratar no paso por onChange:
  // el estado seguia vacio, "Ir" deshabilitado y el siguiente render borraba el
  // campo, asi que el primer intento se perdia. Se toma del DOM al montar.
  useEffect(() => {
    const typed = manualRef.current?.value;
    if (typed) setManual(typed.toUpperCase());
  }, []);

  const needsStation = mode === "estacion" && !stationId;
  const activeStation = stations.find((s) => s.id === stationId);

  const submit = useCallback(
    (rawCode: string) => {
      const code = normalizeCode(rawCode);
      if (!code) return;
      if (mode === "estacion" && !stationId) return;
      startTransition(async () => {
        const result =
          mode === "premio" ? await redeemPrize(code) : await recordScan(code, stationId);
        setOutcome(result);
        setManual("");
        // Refresca los contadores del servidor: el escaneo acaba de moverlos.
        if (result.ok) router.refresh();
      });
    },
    [mode, stationId, router],
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

  const tone =
    outcome === null
      ? null
      : !outcome.ok
        ? "error"
        : outcome.status === "nuevo"
          ? "ok"
          : outcome.status === "premio"
            ? "prize"
            : "warn";

  return (
    <div className="flex flex-col gap-4">
      {mode === "estacion" && (
        <div>
          <label htmlFor="station" className="mb-1.5 block text-sm text-white/60">
            Estación asignada
          </label>
          <select
            id="station"
            className="field appearance-none"
            value={stationId}
            onChange={(event) => {
              setStationId(event.target.value);
              // Cambiar de estacion descarta el pase cargado: no se registra nada.
              setLoadedCode(null);
              setOutcome(null);
              setManual("");
              clearCodeFromUrl();
              try {
                localStorage.setItem(STATION_KEY, event.target.value);
              } catch {
                /* modo privado */
              }
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
        onCode={submit}
        paused={pending || outcome !== null || loadedCode !== null || needsStation}
      />

      {loadedCode && !outcome && (
        <div className="card space-y-3 border border-sky/30 p-5 text-center">
          <p className="text-sm text-white/60">Pase cargado</p>
          <p className="font-mono text-2xl tracking-[0.3em]">{loadedCode}</p>
          <button
            type="button"
            className="btn btn-primary w-full"
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
            className="text-sm text-white/50 underline underline-offset-4"
            onClick={() => {
              setLoadedCode(null);
              clearCodeFromUrl();
            }}
          >
            Cancelar
          </button>
        </div>
      )}

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

      {pending && <p className="text-center text-sm text-white/50">Registrando…</p>}

      {outcome && (
        <div
          className={`animate-pop card border p-5 ${
            tone === "ok"
              ? "border-success/50 bg-success/10"
              : tone === "prize"
                ? "border-gold/50 bg-gold/10"
                : tone === "warn"
                  ? "border-white/25"
                  : "border-alert/50 bg-alert/10"
          }`}
        >
          {!outcome.ok ? (
            <p className="text-center text-lg font-semibold text-alert">{outcome.error}</p>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{outcome.attendee.name}</p>
                <p className="font-mono text-xs tracking-[0.3em] text-white/45">
                  {outcome.attendee.code}
                </p>
                <p
                  className={`mt-2 text-sm font-semibold ${
                    tone === "ok" ? "text-success" : tone === "prize" ? "text-gold" : "text-white/70"
                  }`}
                >
                  {outcome.message}
                </p>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-2xl">
                {outcome.attendee.stations.map((station) => (
                  <span
                    key={station.id}
                    title={station.name}
                    className={station.visitedAt ? "text-gold" : "text-white/15"}
                  >
                    ★
                  </span>
                ))}
              </div>

              <p className="text-center text-sm text-white/70">
                {outcome.attendee.stars} de {outcome.attendee.total} estrellas ·{" "}
                {outcome.attendee.pending === 0 || outcome.attendee.completedAt ? (
                  <span className="font-semibold text-success">recorrido completo</span>
                ) : (
                  <span className="font-semibold text-white">
                    le faltan {outcome.attendee.pending}
                  </span>
                )}
              </p>

              {outcome.attendee.pending > 0 && (
                <ul className="flex flex-wrap justify-center gap-1.5">
                  {outcome.attendee.stations
                    .filter((s) => !s.visitedAt)
                    .map((station) => (
                      <li
                        key={station.id}
                        className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-white/70"
                      >
                        {station.emoji} {station.name}
                      </li>
                    ))}
                </ul>
              )}

              {outcome.attendee.redeemedAt && (
                <p className="text-center text-xs text-white/50">
                  🎁 Premio ya entregado
                  {outcome.attendee.redeemedByName ? ` · ${outcome.attendee.redeemedByName}` : ""}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary mt-5 w-full"
            onClick={() => setOutcome(null)}
          >
            Escanear siguiente
          </button>
        </div>
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
