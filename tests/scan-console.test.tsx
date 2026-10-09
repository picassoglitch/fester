// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const recordScan = vi.fn<(...args: any[]) => Promise<any>>(async () => ({ ok: false as const, error: "x" }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const redeemPrize = vi.fn<(...args: any[]) => Promise<any>>();
let cameraOnCode: ((code: string) => void) | null = null;
const replace = vi.fn();
const playScanFeedback = vi.fn();
const unlockScanFeedback = vi.fn();

vi.mock("@/app/actions/scan", () => ({ recordScan, redeemPrize }));
vi.mock("@/lib/scan-feedback", () => ({
  playScanFeedback,
  unlockScanFeedback,
  readScanSoundMuted: () => localStorage.getItem("fester_scan_sound") === "off",
  saveScanSoundMuted: (muted: boolean) =>
    muted ? localStorage.setItem("fester_scan_sound", "off") : localStorage.removeItem("fester_scan_sound"),
}));
vi.mock("@/components/Scanner", () => ({
  default: ({ onCode }: { onCode: (code: string) => void }) => {
    cameraOnCode = onCode;
    return null;
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, refresh: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));

const stations = [
  { id: "s1", name: "Registro", emoji: "🎟️" },
  { id: "s2", name: "Kiosko 1", emoji: "1️⃣" },
  { id: "s3", name: "Kiosko 2", emoji: "2️⃣" },
];

async function renderConsole(initialCode?: string) {
  const { default: ScanConsole } = await import("@/components/ScanConsole");
  return render(<ScanConsole stations={stations} staffName="Staff" mode="estacion" initialCode={initialCode} />);
}

beforeEach(() => {
  localStorage.clear();
  recordScan.mockClear();
  replace.mockClear();
  playScanFeedback.mockClear();
  unlockScanFeedback.mockClear();
  recordScan.mockReset();
  recordScan.mockImplementation(async () => ({ ok: false as const, error: "x" }));
  redeemPrize.mockReset();
  cameraOnCode = null;
});
afterEach(cleanup);

describe("ScanConsole", () => {
  it("cambiar de estación tras llegar con ?code= no registra estrellas", async () => {
    localStorage.setItem("fester_station", "s1");
    await renderConsole("ABC123");
    expect(await screen.findByText("ABC123")).toBeTruthy();

    const select = screen.getByLabelText("Estación asignada");
    for (const id of ["s2", "s3", "s1", "s2", "s3"]) {
      fireEvent.change(select, { target: { value: id } });
    }
    await new Promise((r) => setTimeout(r, 20));
    expect(recordScan).not.toHaveBeenCalled();
    expect(screen.queryByText("ABC123")).toBeNull();
    expect(replace).toHaveBeenCalledWith("/staff/escanear");
  });

  it("solo registra al confirmar, en la estación elegida", async () => {
    localStorage.setItem("fester_station", "s2");
    await renderConsole("ABC123");
    fireEvent.click(await screen.findByRole("button", { name: "Registrar estrella en Kiosko 1" }));
    await vi.waitFor(() => expect(recordScan).toHaveBeenCalledTimes(1));
    expect(recordScan).toHaveBeenCalledWith("ABC123", "s2");
  });

  it("avisa con pitido y vibración según el resultado del escaneo", async () => {
    localStorage.setItem("fester_station", "s2");
    await renderConsole("ABC123");
    fireEvent.pointerDown(window);
    expect(unlockScanFeedback).toHaveBeenCalled();
    expect(playScanFeedback).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole("button", { name: "Registrar estrella en Kiosko 1" }));
    await vi.waitFor(() => expect(playScanFeedback).toHaveBeenCalledTimes(1));
    // El mock de recordScan responde con error.
    expect(playScanFeedback).toHaveBeenCalledWith("error", { sound: true });
  });

  it("sin estación guardada no elige Registro por defecto y bloquea el escaneo", async () => {
    await renderConsole("ABC123");
    const select = screen.getByLabelText("Estación asignada") as HTMLSelectElement;
    expect(select.value).toBe("");
    expect(screen.getByText("Elige tu estación antes de escanear.")).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Elige tu estación" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Código manual"), { target: { value: "ZZZ999" } });
    expect((screen.getByRole("button", { name: "Ir" }) as HTMLButtonElement).disabled).toBe(true);
    expect(recordScan).not.toHaveBeenCalled();
  });

  it("el código manual tecleado antes de hidratar se registra al primer intento", async () => {
    localStorage.setItem("fester_station", "s2");
    const { default: ScanConsole } = await import("@/components/ScanConsole");
    const ui = <ScanConsole stations={stations} staffName="Staff" mode="estacion" />;

    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(ui);
    // Antes de hidratar el input es HTML puro: el texto llega sin onChange.
    const input = container.querySelector('input[placeholder="Código manual"]') as HTMLInputElement;
    input.value = "abcd1234";

    let root!: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, ui);
    });
    // El efecto de la estación vuelve a renderizar: el código no se borra.
    expect(input.value).toBe("ABCD1234");
    const ir = Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Ir")!;
    expect(ir.disabled).toBe(false);

    fireEvent.submit(input.form!);
    await vi.waitFor(() => expect(recordScan).toHaveBeenCalledTimes(1));
    expect(recordScan).toHaveBeenCalledWith("ABCD1234", "s2");

    act(() => root.unmount());
    container.remove();
  });

  describe("pantalla completa de resultado", () => {
    function progress(over: Record<string, unknown> = {}) {
      return {
        code: "YD54MX",
        name: "Ana Prueba",
        completedAt: null,
        redeemedAt: null,
        redeemedByName: null,
        stars: 7,
        total: 10,
        pending: 3,
        stations: [],
        ...over,
      };
    }

    async function scanManual(code = "YD54MX") {
      fireEvent.change(screen.getByPlaceholderText("Código manual"), { target: { value: code } });
      fireEvent.submit(screen.getByPlaceholderText("Código manual").closest("form")!);
    }

    async function renderAt(mode: "estacion" | "premio" = "estacion") {
      localStorage.setItem("fester_station", "s2");
      const { default: ScanConsole } = await import("@/components/ScanConsole");
      return render(<ScanConsole stations={stations} staffName="Staff" mode={mode} />);
    }

    const cases: Array<{
      name: string;
      mode?: "estacion" | "premio";
      outcome: unknown;
      kind: string;
      texts: string[];
      tone: string;
    }> = [
      {
        name: "estrella nueva",
        outcome: { ok: true, status: "nuevo", message: "Estrella registrada en Kiosko 1.", attendee: progress() },
        kind: "star",
        texts: ["¡LISTO!", "Estrella registrada", "Ana Prueba", "Kiosko 1", "7 de 10 ★"],
        tone: "ok",
      },
      {
        name: "recorrido completo",
        outcome: {
          ok: true,
          status: "premio",
          message: "completo",
          attendee: progress({ stars: 10, pending: 0, completedAt: "2026-10-09T10:00:00Z" }),
        },
        kind: "complete",
        texts: ["¡RECORRIDO COMPLETO!", "Mándalo a Premios", "10 de 10 ★"],
        tone: "prize",
      },
      {
        name: "ya tenía la estrella",
        outcome: {
          ok: true,
          status: "repetido",
          message: "Ana Prueba ya tenía la estrella de Kiosko 1.",
          attendee: progress(),
        },
        kind: "warn",
        texts: ["YA REGISTRADO", "Ana Prueba ya tenía la estrella de Kiosko 1."],
        tone: "warn",
      },
      {
        name: "código que no existe",
        outcome: { ok: false, error: "El código ZZZZZZ no existe." },
        kind: "error",
        texts: ["NO VÁLIDO", "El código ZZZZZZ no existe."],
        tone: "error",
      },
      {
        name: "estación inactiva",
        outcome: { ok: false, error: "Esa estación ya no está activa." },
        kind: "error",
        texts: ["NO VÁLIDO", "Esa estación ya no está activa."],
        tone: "error",
      },
      {
        name: "sin permiso",
        outcome: { ok: false, error: "No tienes permiso para registrar estaciones." },
        kind: "error",
        texts: ["NO VÁLIDO", "No tienes permiso para registrar estaciones."],
        tone: "error",
      },
      {
        name: "premio entregado",
        mode: "premio",
        outcome: {
          ok: true,
          status: "premio",
          message: "Premio entregado a Ana Prueba.",
          attendee: progress({ stars: 10, pending: 0, redeemedAt: "2026-10-09T10:00:00Z" }),
        },
        kind: "prize",
        texts: ["PREMIO ENTREGADO", "Premio entregado a Ana Prueba"],
        tone: "prize",
      },
      {
        name: "premio ya entregado",
        mode: "premio",
        outcome: {
          ok: true,
          status: "repetido",
          message: "Ojo: el premio de Ana Prueba ya se había entregado.",
          attendee: progress({ stars: 10, pending: 0, redeemedAt: "2026-10-09T10:00:00Z" }),
        },
        kind: "warn",
        texts: ["YA REGISTRADO", "Ojo: el premio de Ana Prueba ya se había entregado."],
        tone: "warn",
      },
    ];

    for (const c of cases) {
      it(`${c.name}: color, icono, palabra, sonido y vibración`, async () => {
        const action = c.mode === "premio" ? redeemPrize : recordScan;
        action.mockImplementation(async () => c.outcome);
        await renderAt(c.mode);
        await scanManual();

        const dialog = await screen.findByRole("alertdialog");
        expect(dialog.getAttribute("data-result")).toBe(c.kind);
        expect(dialog.className).toContain("fixed");
        expect(dialog.className).toContain("inset-0");
        for (const text of c.texts) expect(dialog.textContent).toContain(text);
        expect(playScanFeedback).toHaveBeenCalledWith(c.tone, { sound: true });
      });
    }

    it("los resultados correctos se cierran solos; el error se queda hasta tocarlo", async () => {
      recordScan.mockImplementation(async () => ({
        ok: true,
        status: "nuevo",
        message: "ok",
        attendee: progress(),
      }));
      await renderAt();
      await scanManual();
      await screen.findByRole("alertdialog");
      await vi.waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull(), { timeout: 2500 });

      recordScan.mockImplementation(async () => ({ ok: false, error: "El código ZZZZZZ no existe." }));
      await scanManual("ZZZZZZ");
      await screen.findByRole("alertdialog");
      await new Promise((r) => setTimeout(r, 1800));
      expect(screen.getByRole("alertdialog")).toBeTruthy();
      fireEvent.click(screen.getByRole("alertdialog"));
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("error de red ofrece Reintentar con el mismo código", async () => {
      recordScan.mockImplementationOnce(async () => {
        throw new Error("Failed to fetch");
      });
      await renderAt();
      await scanManual("W5MWGX");
      const dialog = await screen.findByRole("alertdialog");
      expect(dialog.textContent).toContain("Sin conexión");

      recordScan.mockImplementation(async () => ({
        ok: true,
        status: "nuevo",
        message: "ok",
        attendee: progress({ code: "W5MWGX" }),
      }));
      fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
      await vi.waitFor(() => expect(recordScan).toHaveBeenCalledTimes(2));
      expect(recordScan).toHaveBeenLastCalledWith("W5MWGX", "s2");
    });

    it("el mismo QR sostenido frente a la cámara cuenta una sola vez", async () => {
      recordScan.mockImplementation(async () => ({
        ok: true,
        status: "nuevo",
        message: "ok",
        attendee: progress(),
      }));
      await renderAt();
      await act(async () => cameraOnCode!("YD54MX"));
      await screen.findByRole("alertdialog");
      // Llega otra lectura del mismo QR mientras se ve el resultado y después de cerrarlo.
      await act(async () => cameraOnCode!("YD54MX"));
      fireEvent.click(screen.getByRole("alertdialog"));
      await act(async () => cameraOnCode!("YD54MX"));
      await new Promise((r) => setTimeout(r, 50));
      expect(recordScan).toHaveBeenCalledTimes(1);
      // Cerrado y sin un segundo resultado del mismo pase.
      expect(screen.queryAllByRole("alertdialog")).toHaveLength(0);
    });

    it("mientras el servidor responde muestra Registrando y no manda dos veces", async () => {
      let resolve!: (v: unknown) => void;
      recordScan.mockImplementation(() => new Promise((r) => (resolve = r)));
      await renderAt();
      await scanManual();
      expect(await screen.findByText("Registrando…")).toBeTruthy();
      await act(async () => cameraOnCode!("FV28QG"));
      expect(recordScan).toHaveBeenCalledTimes(1);
      await act(async () =>
        resolve({ ok: true, status: "nuevo", message: "ok", attendee: progress() }),
      );
      await screen.findByRole("alertdialog");
    });

    it("el silencio se guarda y sigue después de recargar", async () => {
      recordScan.mockImplementation(async () => ({ ok: false, error: "x" }));
      const first = await renderAt();
      fireEvent.click(screen.getByRole("button", { name: "Silenciar" }));
      expect(localStorage.getItem("fester_scan_sound")).toBe("off");
      first.unmount();

      await renderAt();
      const toggle = await screen.findByRole("button", { name: "Activar sonido" });
      expect(toggle.textContent).toBe("🔇");
      await scanManual();
      await screen.findByRole("alertdialog");
      expect(playScanFeedback).toHaveBeenCalledWith("error", { sound: false });
    });

    it("la barra muestra la estación activa", async () => {
      await renderAt();
      expect(screen.getByText("Estación:")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Cambiar" })).toBeTruthy();
    });
  });

  it("con pase cargado y sin estación guardada se elige la estación en la hoja sin perder el pase", async () => {
    await renderConsole("FV28QG");
    const sheet = await screen.findByRole("dialog", { name: "Pase cargado" });
    expect(sheet.textContent).toContain("FV28QG");
    fireEvent.change(screen.getByLabelText("Elige tu estación para registrar este pase"), {
      target: { value: "s3" },
    });
    // El pase sigue cargado y ahora se puede confirmar en la estación elegida.
    expect(screen.getByRole("dialog", { name: "Pase cargado" }).textContent).toContain("FV28QG");
    expect(localStorage.getItem("fester_station")).toBe("s3");
    fireEvent.click(screen.getByRole("button", { name: "Registrar estrella en Kiosko 2" }));
    await vi.waitFor(() => expect(recordScan).toHaveBeenCalledWith("FV28QG", "s3"));
  });
});
