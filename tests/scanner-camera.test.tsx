// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

// Camara lenta como en iPhone: la promesa se resuelve cuando la prueba lo decide.
const pending: { resolve: (c: { stop: () => void }) => void; stop: ReturnType<typeof vi.fn> }[] = [];
const decodeFromConstraints = vi.fn(
  (_c: unknown, _v: unknown, cb: (r: { getText: () => string } | undefined) => void) => {
    lastCallback = cb;
    return new Promise<{ stop: () => void }>((resolve) => {
      pending.push({ resolve, stop: vi.fn() });
    });
  },
);
let lastCallback: ((r: { getText: () => string } | undefined) => void) | null = null;

vi.mock("@zxing/browser", () => ({
  BrowserQRCodeReader: vi.fn().mockImplementation(() => ({ decodeFromConstraints })),
}));

afterEach(() => {
  cleanup();
  pending.length = 0;
  decodeFromConstraints.mockClear();
});

describe("Scanner", () => {
  it("un onCode nuevo (estación restaurada al montar) no reinicia la cámara", async () => {
    const { default: Scanner } = await import("@/components/Scanner");
    const first = vi.fn();
    const second = vi.fn();
    const view = render(<Scanner onCode={first} />);
    view.rerender(<Scanner onCode={second} />);

    await act(async () => {
      for (const p of pending) p.resolve({ stop: p.stop });
    });

    // Una sola apertura: antes la segunda corria y la primera, al cerrar tarde, dejaba el video en negro.
    expect(decodeFromConstraints).toHaveBeenCalledTimes(1);
    expect(pending[0].stop).not.toHaveBeenCalled();

    // Y el codigo leido llega al callback vigente, con la estacion correcta.
    lastCallback?.({ getText: () => "ABC123" });
    expect(second).toHaveBeenCalledWith("ABC123");
    expect(first).not.toHaveBeenCalled();
  });

  it("al desmontar apaga la cámara aunque haya abierto después", async () => {
    const { default: Scanner } = await import("@/components/Scanner");
    const view = render(<Scanner onCode={vi.fn()} />);
    view.unmount();
    await act(async () => {
      pending[0].resolve({ stop: pending[0].stop });
    });
    expect(pending[0].stop).toHaveBeenCalledTimes(1);
  });
});
