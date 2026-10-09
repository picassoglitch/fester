/**
 * Aviso en el celular del staff al terminar cada escaneo: un pitido corto y una
 * vibracion distintos segun el resultado, para no tener que mirar la pantalla
 * en una fila rapida.
 *
 * El navegador solo deja sonar audio despues de un toque del usuario, asi que
 * la consola llama a unlockScanFeedback() en el primer toque o tecla. En iOS
 * no hay vibracion y el interruptor de silencio apaga el pitido: ahi el aviso
 * es solo la pantalla, como antes.
 */

export type ScanTone = "ok" | "prize" | "warn" | "error";

type Beep = { freq: number; ms: number; wave: OscillatorType };

export const SCAN_FEEDBACK: Record<ScanTone, { beeps: Beep[]; vibrate: number[] }> = {
  // Estrella nueva: un pitido agudo y corto.
  ok: { beeps: [{ freq: 880, ms: 120, wave: "sine" }], vibrate: [80] },
  // Recorrido completo o premio entregado: tres notas que suben.
  prize: {
    beeps: [
      { freq: 660, ms: 110, wave: "sine" },
      { freq: 880, ms: 110, wave: "sine" },
      { freq: 1175, ms: 180, wave: "sine" },
    ],
    vibrate: [80, 60, 80, 60, 160],
  },
  // Ya lo tenia: dos pitidos medios.
  warn: {
    beeps: [
      { freq: 520, ms: 90, wave: "triangle" },
      { freq: 520, ms: 90, wave: "triangle" },
    ],
    vibrate: [60, 80, 60],
  },
  // Error: un zumbido grave y largo.
  error: { beeps: [{ freq: 200, ms: 350, wave: "square" }], vibrate: [300] },
};

const GAP_MS = 70;
const VOLUME = 0.2;

let audio: AudioContext | null = null;

function getAudio(): AudioContext | null {
  if (audio) return audio;
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    audio = new Ctor();
  } catch {
    return null;
  }
  return audio;
}

/** Llamar desde un toque o tecla: deja el audio listo para los avisos. */
export function unlockScanFeedback(): void {
  const ctx = getAudio();
  if (ctx?.state === "suspended") void ctx.resume().catch(() => {});
}

export function playScanFeedback(tone: ScanTone): void {
  const { beeps, vibrate } = SCAN_FEEDBACK[tone];

  try {
    navigator.vibrate?.(vibrate);
  } catch {
    /* sin vibracion */
  }

  const ctx = getAudio();
  if (!ctx || ctx.state !== "running") return;
  try {
    let at = ctx.currentTime;
    for (const beep of beeps) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const end = at + beep.ms / 1000;
      osc.type = beep.wave;
      osc.frequency.setValueAtTime(beep.freq, at);
      // Rampa corta al inicio y al final para que no truene.
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(VOLUME, at + 0.01);
      gain.gain.setValueAtTime(VOLUME, end - 0.02);
      gain.gain.linearRampToValueAtTime(0, end);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(end);
      at = end + GAP_MS / 1000;
    }
  } catch {
    /* sin audio: queda la pantalla */
  }
}
