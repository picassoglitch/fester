// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const drawWinner = vi.fn(async (_key: string) => ({ ok: false as const, error: "x" }));
const voidWinner = vi.fn(async () => ({ ok: true }));
const resetRaffle = vi.fn(async () => ({ deleted: 3 }));
vi.mock("@/app/actions/raffle", () => ({ drawWinner, voidWinner, resetRaffle }));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/components/FesterLogo", () => ({ default: () => null }));

afterEach(() => {
  cleanup();
  drawWinner.mockClear();
});

async function renderStage(
  filled: Record<string, number>,
  winners: { prizeKey: string | null; voided?: boolean }[] = [],
  pools = { Aplicador: 5, Profesionista: 4 },
  pending = { Aplicador: 2, Profesionista: 7 },
) {
  const { default: RaffleStage } = await import("@/components/RaffleStage");
  return render(
    <RaffleStage
      pools={pools}
      pending={pending}
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
    expect(screen.queryByText(/rotular/i)).toBeNull();
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

  function revealWith(winnerName: string) {
    // Movimiento reducido: sin la espera ni el mosaico, se revela de inmediato.
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce"), media: q }));
    drawWinner.mockImplementationOnce(async (key: string) => ({
      ok: true,
      winner: { id: "nuevo", name: winnerName, code: "N1", company: null, state: null, prizeKey: key },
    }) as never);
  }

  it("al ganar el único lugar, el botón pasa al siguiente premio sin esperar al refresh", async () => {
    revealWith("Ana Ganadora");
    await renderStage({});
    fireEvent.keyDown(document.body, { key: " " });
    await screen.findByText("Ana Ganadora");
    expect(drawWinner).toHaveBeenCalledWith("kit-01");
    expect(screen.queryByRole("button", { name: "Sortear otro lugar" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente premio" }));
    expect(screen.getByRole("heading").textContent).toBe("Constructor de Aplicación");
    vi.unstubAllGlobals();
  });

  it("si el sonido falla, el ganador ya registrado se revela igual", async () => {
    revealWith("Beto Ganador");
    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          throw new Error("sin audio");
        }
      },
    );
    await renderStage({});
    fireEvent.keyDown(document.body, { key: " " });
    await screen.findByText("Beto Ganador");
    expect(screen.getByText("Se lleva")).toBeTruthy();
    vi.unstubAllGlobals();
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

  it("muestra cuántos participan por categoría, el total y los que faltan de pasaporte", async () => {
    const { container } = await renderStage({}, [], { Aplicador: 22, Profesionista: 1234 }, { Aplicador: 8, Profesionista: 0 });
    const counts = container.querySelector('dl[aria-label="Participantes"]')!.textContent!.replace(/\s+/g, " ");
    expect(counts).toContain("aplicadores22 participan · 8 llegaron sin completar pasaporte");
    expect(counts).toContain("profesionistas1,234 participan · 0 llegaron sin completar pasaporte");
    expect(counts).toContain("Total1,256 participan");
    // En la vista del premio, el pool de su categoría.
    expect(screen.getByText(/^Participan/).textContent).toBe("Participan 22 aplicadores");
    fireEvent.click(pill(/^Kit 03/));
    expect(screen.getByText(/^Participan/).textContent).toBe("Participan 1,234 profesionistas");
  });

  it("reiniciar pide confirmar dentro de la página y luego avisa que quedó en 0", async () => {
    resetRaffle.mockClear();
    const confirm = vi.fn();
    vi.stubGlobal("confirm", confirm);
    const winners = [{ prizeKey: "kit-01" }, { prizeKey: "kit-04", voided: true }, { prizeKey: null }];
    const { rerender } = await renderStage({ "kit-01": 1 }, winners);
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar rifa" }));
    expect(screen.getByRole("alertdialog").textContent).toContain("Esto borra 3 ganadores (anulados incluidos)");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(resetRaffle).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Reiniciar rifa" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, reiniciar" }));
    await waitFor(() => expect(resetRaffle).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(confirm).not.toHaveBeenCalled();
    // El refresh trae la lista vacía.
    const { default: RaffleStage } = await import("@/components/RaffleStage");
    rerender(
      <RaffleStage
        pools={{ Aplicador: 5, Profesionista: 4 }}
        pending={{ Aplicador: 0, Profesionista: 0 }}
        reels={{ Aplicador: ["A1"], Profesionista: ["P1"] }}
        filled={{}}
        winners={[]}
      />,
    );
    expect(screen.getByRole("status").textContent).toBe("Rifa reiniciada: 0 ganadores");
    expect(screen.queryByRole("button", { name: "Reiniciar rifa" })).toBeNull();
    expect(screen.getByRole("heading").textContent).toBe("Constructor Premium");
    vi.unstubAllGlobals();
  });

  it("si el reinicio falla lo dice y no avisa 0 ganadores", async () => {
    resetRaffle.mockRejectedValueOnce(new Error("red"));
    await renderStage({}, [{ prizeKey: "kit-01" }]);
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar rifa" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, reiniciar" }));
    await screen.findByText("No se pudo reiniciar la rifa. Recarga la página e intenta de nuevo.");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("mientras se reinicia, Espacio no arranca un sorteo; Escape cierra la confirmación", async () => {
    let release: (v: { deleted: number }) => void = () => {};
    resetRaffle.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));
    await renderStage({}, [{ prizeKey: "kit-01" }]);
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar rifa" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancelar" }));
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Reiniciar rifa" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, reiniciar" }));
    (document.activeElement as HTMLElement | null)?.blur();
    fireEvent.keyDown(document.body, { key: " " });
    expect(drawWinner).not.toHaveBeenCalled();
    release({ deleted: 1 });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("al arrancar un sorteo se cierra la confirmación de reinicio", async () => {
    await renderStage({}, [{ prizeKey: "kit-01" }]);
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar rifa" }));
    (document.activeElement as HTMLElement | null)?.blur();
    fireEvent.keyDown(document.body, { key: " " });
    await waitFor(() => expect(drawWinner).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("en pantalla completa no se ven los conteos de participantes; al salir vuelven", async () => {
    await renderStage({});
    const dl = screen.getByLabelText("Participantes");
    const stage = dl.parentElement!;
    expect(screen.getByLabelText("Participantes")).toBeTruthy();

    Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => stage });
    fireEvent(document, new Event("fullscreenchange"));
    await waitFor(() => expect(screen.queryByLabelText("Participantes")).toBeNull());
    expect(screen.queryByText(/participan/)).toBeNull();

    Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => null });
    fireEvent(document, new Event("fullscreenchange"));
    await waitFor(() => expect(screen.getByLabelText("Participantes")).toBeTruthy());
  });
});
