// @vitest-environment jsdom
// Aldo 2026-11-05 — /puerta sin token valido es el registro publico: se ve cerrado y sin formulario.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { REGISTRATION_CLOSED } from "@/lib/event";

vi.mock("@/app/actions/door", () => ({ selfRegisterAtDoor: vi.fn() }));
vi.mock("@/components/QrCode", () => ({ default: () => null }));
// jose no firma dentro de jsdom; la validez del token se prueba en registro-puerta.test.ts.
vi.mock("@/lib/door-token", () => ({ isValidDoorToken: vi.fn(async (t?: string) => t === "valido") }));

afterEach(cleanup);

async function renderPage(t?: string) {
  const { default: Page } = await import("@/app/puerta/page");
  render(await Page({ searchParams: Promise.resolve(t === undefined ? {} : { t }) }));
}

describe("/puerta", () => {
  it("sin token o con token inválido muestra registro cerrado y la liga a Mi cuenta", async () => {
    for (const t of [undefined, "basura"]) {
      await renderPage(t);
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(REGISTRATION_CLOSED.banner);
      expect(screen.getByRole("link", { name: REGISTRATION_CLOSED.cta }).getAttribute("href")).toBe("/mi-cuenta");
      expect(screen.queryByRole("textbox")).toBeNull();
      cleanup();
    }
  });

  it("con token válido muestra solo correo, nombre y puesto", async () => {
    await renderPage("valido");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Registro en la entrada");
    expect(screen.getByLabelText("Correo")).toBeTruthy();
    expect(screen.getByLabelText("Nombre completo")).toBeTruthy();
    expect(screen.getByLabelText("Puesto")).toBeTruthy();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getByRole("option", { name: "Estudiante" })).toBeTruthy();
    expect(screen.queryByText(/términos|edad/i)).toBeNull();
  });
});
