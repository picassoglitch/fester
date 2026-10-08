// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";

const loginWithPin = vi.fn(async () => ({}));
vi.mock("@/app/actions/session", () => ({ loginWithPin }));

afterEach(cleanup);

// El SSR de React tambien emite su propio <script> (replay de formularios).
function bufferScript(container: HTMLElement) {
  return Array.from(container.querySelectorAll("script")).find((el) =>
    el.textContent?.includes("__festerPinKeys"),
  );
}

function pinValue(container: HTMLElement) {
  return (container.querySelector('input[name="pin"]') as HTMLInputElement).value;
}

describe("PinLogin", () => {
  it("el teclado físico llena el PIN, ignora el noveno dígito y Enter envía", async () => {
    const { default: PinLogin } = await import("@/components/PinLogin");
    const { container } = render(<PinLogin next="/staff/escanear" />);
    const submit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => {});

    for (const key of "123456789") fireEvent.keyDown(document, { key });
    expect(pinValue(container)).toBe("12345678");
    expect(screen.getByText("8 de 8 dígitos")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Backspace" });
    expect(pinValue(container)).toBe("1234567");

    fireEvent.keyDown(document, { key: "Enter" });
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("Enter no envía con menos de 4 dígitos y muestra 8 puntos", async () => {
    const { default: PinLogin } = await import("@/components/PinLogin");
    const { container } = render(<PinLogin next="/staff/escanear" />);
    const submit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => {});
    submit.mockClear();
    fireEvent.keyDown(document, { key: "1" });
    fireEvent.keyDown(document, { key: "Enter" });
    expect(submit).not.toHaveBeenCalled();
    expect(container.querySelectorAll('span[aria-hidden="true"]')).toHaveLength(8);
  });

  it("escucha en window desde el montaje: teclas en window, en body y en document", async () => {
    const { default: PinLogin } = await import("@/components/PinLogin");
    const { container } = render(<PinLogin next="/staff/escanear" />);
    const submit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => {});
    submit.mockClear();

    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(document.body, { key: "2" });
    fireEvent.keyDown(document, { key: "3" });
    fireEvent.keyDown(window, { key: "4" });
    expect(pinValue(container)).toBe("1234");

    fireEvent.keyDown(window, { key: "Enter" });
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("no captura lo que se escribe en otro campo", async () => {
    const { default: PinLogin } = await import("@/components/PinLogin");
    const { container } = render(
      <>
        <input aria-label="otro" />
        <PinLogin next="/staff/escanear" />
      </>,
    );
    const other = screen.getByLabelText("otro");
    other.focus();
    fireEvent.keyDown(other, { key: "5" });
    fireEvent.keyDown(other, { key: "Backspace" });
    expect(pinValue(container)).toBe("");
  });

  it("lo tecleado antes de hidratar no se pierde: el PIN se llena y Enter envía", async () => {
    const { default: PinLogin } = await import("@/components/PinLogin");
    const submit = vi.spyOn(HTMLFormElement.prototype, "requestSubmit").mockImplementation(() => {});
    submit.mockClear();

    // HTML del servidor. innerHTML no ejecuta <script>: se corre a mano, como
    // lo haria el navegador al parsear la pagina.
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(<PinLogin next="/staff/escanear" />);
    const script = bufferScript(container);
    expect(script).toBeTruthy();
    new Function(script!.textContent!)();

    // Antes de hidratar: sin React, el usuario teclea 9 dígitos, borra uno y da Enter.
    for (const key of "123456789") fireEvent.keyDown(document.body, { key });
    fireEvent.keyDown(document.body, { key: "Backspace" });
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(pinValue(container)).toBe("");

    const errors: unknown[] = [];
    let root!: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, <PinLogin next="/staff/escanear" />, {
        onRecoverableError: (error) => errors.push(error),
      });
    });
    expect(errors).toEqual([]);
    expect(pinValue(container)).toBe("1234567");
    expect(submit).toHaveBeenCalledTimes(1);
    // El script ya no esta en el DOM y su listener se quito: no duplica teclas.
    expect(bufferScript(container)).toBeUndefined();
    fireEvent.keyDown(document.body, { key: "8" });
    expect(pinValue(container)).toBe("12345678");

    act(() => root.unmount());
    container.remove();
  });

  it("montado en el cliente (sin SSR) no renderiza el script", async () => {
    const { default: PinLogin } = await import("@/components/PinLogin");
    const { container } = render(<PinLogin next="/staff/escanear" />);
    expect(bufferScript(container)).toBeUndefined();
  });
});
