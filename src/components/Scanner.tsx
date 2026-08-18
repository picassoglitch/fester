"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";

const REPEAT_GUARD_MS = 3500;

export default function Scanner({
  onCode,
  paused = false,
}: {
  onCode: (code: string) => void;
  paused?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const pausedRef = useRef(paused);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 250 });

    async function start() {
      if (!videoRef.current) return;
      try {
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result) => {
            if (!result || pausedRef.current) return;
            const text = result.getText();
            const now = Date.now();
            if (lastRef.current.code === text && now - lastRef.current.at < REPEAT_GUARD_MS) return;
            lastRef.current = { code: text, at: now };
            navigator.vibrate?.(60);
            onCode(text);
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setReady(true);
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        setError(
          name === "NotAllowedError"
            ? "Permiso de cámara denegado. Actívalo en los ajustes del navegador."
            : name === "NotFoundError"
              ? "No encontramos una cámara en este dispositivo."
              : "No pudimos abrir la cámara. Usa el código manual.",
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [onCode]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-black">
      <video
        ref={videoRef}
        className="aspect-[3/4] w-full object-cover sm:aspect-video"
        muted
        playsInline
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={`h-52 w-52 rounded-2xl border-2 transition ${
            paused ? "border-mint/70" : "border-white/70"
          }`}
        />
      </div>

      {!ready && !error && (
        <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white/60">
          Iniciando cámara…
        </p>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-night/90 p-6 text-center text-sm text-coral">
          {error}
        </div>
      )}
    </div>
  );
}
