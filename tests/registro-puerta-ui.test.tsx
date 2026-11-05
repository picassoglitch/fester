// @vitest-environment jsdom
// Aldo 2026-11-05 — pantalla de la puerta: pase grande, «Dejar pasar» con foro lleno y aviso sin revelar pases ajenos.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const registerWalkIn = vi.fn();
const admitWalkIn = vi.fn();
const selfRegisterAtDoor = vi.fn();
vi.mock("@/app/actions/door", () => ({ registerWalkIn, admitWalkIn, selfRegisterAtDoor }));
vi.mock("@/components/QrCode", () => ({ default: () => <div data-testid="qr" /> }));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const pass = { code: "ABC234", name: "Pedro Puerta", created: true, mailFailed: true, qrValue: "http://x/s/ABC234" };

async function submit() {
  fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "p@example.com" } });
  fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Pedro Puerta" } });
  fireEvent.change(screen.getByLabelText("Puesto"), { target: { value: "DIY" } });
  await act(async () => {
    fireEvent.submit(screen.getByLabelText("Correo").closest("form")!);
  });
}

describe("DoorRegister (staff)", () => {
  it("foro lleno: muestra el pase, «Dejar pasar» manda override y luego la Entrada", async () => {
    registerWalkIn.mockResolvedValue({ pass, entry: { status: "confirmar", inside: 450 } });
    admitWalkIn.mockResolvedValue({ status: "entrada", inside: 451 });
    const { default: DoorRegister } = await import("@/components/DoorRegister");
    render(<DoorRegister capacity={450} />);
    await submit();

    expect(await screen.findByText("ABC234")).toBeTruthy();
    expect(screen.getByText(/No pudimos enviar el pase por correo/)).toBeTruthy();
    expect(screen.getByText(/El foro está lleno/)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Dejar pasar" }));
    });
    expect(admitWalkIn).toHaveBeenCalledWith("ABC234", true);
    expect(await screen.findByText(/Entrada registrada · Dentro del foro: 451\/450/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Registrar a otra persona" }));
    expect((screen.getByLabelText("Correo") as HTMLInputElement).value).toBe("");
  });

  it("error de validación: lo muestra y conserva lo escrito", async () => {
    registerWalkIn.mockResolvedValue({ error: "El correo no parece válido." });
    const { default: DoorRegister } = await import("@/components/DoorRegister");
    render(<DoorRegister capacity={450} />);
    await submit();
    expect((await screen.findByRole("alert")).textContent).toBe("El correo no parece válido.");
    expect((screen.getByLabelText("Correo") as HTMLInputElement).value).toBe("p@example.com");
  });
});

describe("DoorSelfSignup (QR)", () => {
  it("correo con pase: solo el aviso, sin pase ni formulario", async () => {
    selfRegisterAtDoor.mockResolvedValue({ notice: "Este correo ya tiene pase; te lo reenviamos a tu correo." });
    const { default: DoorSelfSignup } = await import("@/components/DoorSelfSignup");
    render(<DoorSelfSignup token="t" />);
    await submit();
    expect((await screen.findByRole("status")).textContent).toMatch(/ya tiene pase/);
    expect(screen.queryByTestId("door-pass")).toBeNull();
    expect(screen.queryByLabelText("Correo")).toBeNull();
  });
});
