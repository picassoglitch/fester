// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const drawWinner = vi.fn(async (_key: string) => ({ ok: false as const, error: "x" }));
const voidWinner = vi.fn(async () => ({ ok: true }));
vi.mock("@/app/actions/raffle", () => ({ drawWinner, voidWinner }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/FesterLogo", () => ({ default: () => null }));

afterEach(() => {
  cleanup();
  drawWinner.mockClear();
});

async function renderStage(
  filled: Record<string, number>,
  winners: { prizeKey: string | null; voided?: boolean }[] = [],
  pools = { Aplicador: 5, Profesionista: 4 },
) {
  const { default: RaffleStage } = await import("@/components/RaffleStage");
  return render(
    <RaffleStage
      pools={pools}
      reels={{ Aplicador: ["A1", "A2"], Profesionista: ["P1"] }}
      filled={filled}
      winners={winners.map((w, i) => ({
        id: `w${i}`,
        name: `Ganador ${i}`,
        code: `C${i}`,
        company: null,
        state: null,
        prizeKey: w.prizeKey,
        voided: w.voided ?? false,
      }))}
    />,
  );
}

const pill = (name: RegExp, index = 0) =>
  screen.getAllByRole("button", { name }).filter((b) => b.closest("nav"))[index];

describe("escenario de la rifa por premio", () => {
  it("abre en el primer premio con lugar y muestra su contenido y foto", async () => {
    await renderStage({ "kit-01": 1 });
    expect(screen.getByRole("heading").textContent).toBe("Constructor de Aplicación");
    expect(screen.getByText("Mezcladora RUBI RUBIMIX-9 SUPERTORQUE")).toBeTruthy();
    expect(screen.getByText("0 de 2 ganadores")).toBeTruthy();
    expect(screen.getByRole("img").getAttribute("src")).toBe("/rifa/kit-02.webp");
  });

  it("sin archivo de foto se ve la ficha del premio, no una imagen rota", async () => {
    await renderStage({});
    fireEvent.click(pill(/^Moto/, 0));
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Sin rotular")).toBeTruthy();
    expect(screen.getAllByText("1 motocicleta · premio para aplicador").length).toBeGreaterThan(0);
  });

  it("un premio lleno bloquea el botón y lo explica", async () => {
    await renderStage({ "kit-03": 1 });
    fireEvent.click(pill(/^Kit 03/));
    const button = screen.getByRole("button", { name: "Premio completo" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText("Kit 03 · Arquitecto Medición ya tiene ganador.")).toBeTruthy();
    fireEvent.keyDown(document.body, { key: " " });
    expect(drawWinner).not.toHaveBeenCalled();
  });

  it("Espacio sortea el premio elegido aunque se acabe de dar clic en él", async () => {
    await renderStage({});
    const kit04 = pill(/^Kit 04/);
    kit04.focus();
    fireEvent.click(kit04);
    expect(document.activeElement).not.toBe(kit04);
    fireEvent.keyDown(document.body, { key: " " });
    await waitFor(() => expect(drawWinner).toHaveBeenCalledWith("kit-04"));
  });

  it("sin participantes de la categoría el botón se bloquea con el aviso del premio", async () => {
    await renderStage({}, [], { Aplicador: 0, Profesionista: 4 });
    expect((screen.getByRole("button", { name: "Sortear" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("No quedan aplicadores por sortear para Kit 01 · Constructor Premium.")).toBeTruthy();
  });

  it("dos Espacios seguidos piden un solo sorteo", async () => {
    let release: (v: { ok: false; error: string }) => void = () => {};
    drawWinner.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));
    await renderStage({});
    fireEvent.keyDown(document.body, { key: " " });
    fireEvent.keyDown(document.body, { key: " " });
    expect(drawWinner).toHaveBeenCalledTimes(1);
    expect(drawWinner).toHaveBeenCalledWith("kit-01");
    release({ ok: false, error: "x" });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("x"));
  });

  it("la lista de ganadores dice qué premio se llevó cada quien", async () => {
    const { container } = await renderStage({ "kit-01": 1 }, [
      { prizeKey: "kit-01" },
      { prizeKey: null },
      { prizeKey: "kit-04", voided: true },
    ]);
    const list = container.querySelector("footer ol")!;
    expect(list.textContent).toContain("Kit 01 · Constructor Premium");
    expect(list.textContent).toContain("sin premio");
    expect(list.textContent).toContain("Kit 04 · Arquitecto Tecnología");
    expect(screen.getByText("Ganadores (2)")).toBeTruthy();
  });
});
