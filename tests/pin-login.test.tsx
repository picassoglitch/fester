// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const loginWithPin = vi.fn(async () => ({}));
vi.mock("@/app/actions/session", () => ({ loginWithPin }));

afterEach(cleanup);

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
});
