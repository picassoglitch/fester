// @vitest-environment jsdom
// Aldo 2026-11-05 — el botón «Reenviar pase» del admin muestra a qué correo salió o el error.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const resendPassAsAdmin = vi.fn();
vi.mock("@/app/actions/admin", () => ({ resendPassAsAdmin }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function click() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Reenviar pase" }));
  });
}

describe("ResendPassButton", () => {
  it("manda el código del asistente y muestra «Pase reenviado a <correo>»", async () => {
    resendPassAsAdmin.mockResolvedValue({ ok: "Pase reenviado a rosa@example.com" });
    const { default: ResendPassButton } = await import("@/components/ResendPassButton");
    render(<ResendPassButton code="ABC234" />);
    await click();

    expect((await screen.findByRole("status")).textContent).toBe("Pase reenviado a rosa@example.com");
    const sent = resendPassAsAdmin.mock.calls[0][1] as FormData;
    expect(sent.get("code")).toBe("ABC234");
  });

  it("muestra el error cuando el envío falla", async () => {
    resendPassAsAdmin.mockResolvedValue({ error: "No se pudo reenviar el pase a rosa@example.com. Intenta de nuevo." });
    const { default: ResendPassButton } = await import("@/components/ResendPassButton");
    render(<ResendPassButton code="ABC234" compact />);
    await click();

    expect((await screen.findByRole("alert")).textContent).toMatch(/No se pudo reenviar el pase a rosa@example.com/);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
