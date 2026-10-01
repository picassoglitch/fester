// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const recordScan = vi.fn(async () => ({ ok: false as const, error: "x" }));
const redeemPrize = vi.fn();
const replace = vi.fn();

vi.mock("@/app/actions/scan", () => ({ recordScan, redeemPrize }));
vi.mock("@/components/Scanner", () => ({ default: () => null }));
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
});
