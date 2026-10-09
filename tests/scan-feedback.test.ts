// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FakeCtx = { state: string; started: number; resume: ReturnType<typeof vi.fn> };
let ctx: FakeCtx;

function installAudio(state: string) {
  class FakeAudioContext {
    state = state;
    currentTime = 0;
    destination = {};
    started = 0;
    resume = vi.fn(async () => {
      this.state = "running";
    });
    constructor() {
      ctx = this as unknown as FakeCtx;
    }
    createOscillator() {
      const self = this;
      return {
        type: "sine",
        frequency: { setValueAtTime: vi.fn() },
        connect: (node: unknown) => node,
        start: () => {
          self.started++;
        },
        stop: vi.fn(),
      };
    }
    createGain() {
      const param = { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
      return { gain: param, connect: (node: unknown) => node };
    }
  }
  vi.stubGlobal("AudioContext", FakeAudioContext);
}

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("aviso de escaneo para el staff", () => {
  it("cada resultado tiene su propio pitido y vibración", async () => {
    const { SCAN_FEEDBACK } = await import("@/lib/scan-feedback");
    const patterns = Object.values(SCAN_FEEDBACK).map((f) => JSON.stringify(f));
    expect(new Set(patterns).size).toBe(4);
    expect(SCAN_FEEDBACK.ok.beeps).toHaveLength(1);
    expect(SCAN_FEEDBACK.prize.beeps).toHaveLength(3);
  });

  it("vibra con el patrón del resultado y suena tras desbloquear el audio", async () => {
    installAudio("suspended");
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    const { playScanFeedback, unlockScanFeedback, SCAN_FEEDBACK } = await import("@/lib/scan-feedback");

    unlockScanFeedback();
    await Promise.resolve();
    expect(ctx.resume).toHaveBeenCalled();

    playScanFeedback("prize");
    expect(vibrate).toHaveBeenCalledWith(SCAN_FEEDBACK.prize.vibrate);
    expect(ctx.started).toBe(3);
  });

  it("con el audio bloqueado solo vibra, sin tronar", async () => {
    installAudio("suspended");
    const { playScanFeedback } = await import("@/lib/scan-feedback");
    expect(() => playScanFeedback("ok")).not.toThrow();
    expect(ctx.started).toBe(0);
  });

  it("sin AudioContext ni vibración no falla", async () => {
    vi.stubGlobal("AudioContext", undefined);
    Object.defineProperty(navigator, "vibrate", { value: undefined, configurable: true });
    const { playScanFeedback, unlockScanFeedback } = await import("@/lib/scan-feedback");
    expect(() => {
      unlockScanFeedback();
      playScanFeedback("error");
    }).not.toThrow();
  });
});
