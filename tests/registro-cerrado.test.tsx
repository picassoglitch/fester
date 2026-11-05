// @vitest-environment jsdom
// Aldo 2026-11-04: cupo lleno. El cierre vale en el servidor y en la landing.
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { REGISTRATION_CLOSED, REGISTRATION_OPEN } from "@/lib/event";

const create = vi.fn();
const issueEmailCode = vi.fn();
vi.mock("next/navigation", () => ({ redirect: vi.fn(), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/auth", () => ({ setAttendeeSessionCookie: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { attendee: { create, findFirst: vi.fn() } } }));
vi.mock("@/lib/mail", () => ({ sendMail: vi.fn() }));
vi.mock("@/lib/throttle", () => ({ clientIpHash: vi.fn(async () => "iphash") }));
vi.mock("@/lib/verification", async (orig) => ({
  ...(await orig<typeof import("@/lib/verification")>()),
  issueEmailCode,
  confirmEmailCode: vi.fn(),
}));

afterEach(cleanup);

describe("registro cerrado", () => {
  it("la bandera está apagada", () => {
    expect(REGISTRATION_OPEN).toBe(false);
  });

  it("el servidor rechaza cualquier envío sin mandar código ni crear asistente", async () => {
    const { registerAttendee } = await import("@/app/actions/register");
    const form = new FormData();
    form.set("name", "Persona Prueba");
    form.set("email", "prueba@example.com");
    form.set("terms", "on");
    form.set("intent", "verify");
    form.set("code", "123456");
    const state = await registerAttendee({}, form);
    expect(state).toEqual({ error: REGISTRATION_CLOSED.error });
    expect(issueEmailCode).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("la landing muestra el aviso y lleva a recuperar el pase, sin formulario", async () => {
    const { default: Registration } = await import("@/components/landing/Registration");
    render(<Registration />);
    expect(screen.getAllByText(REGISTRATION_CLOSED.banner).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: REGISTRATION_CLOSED.cta }).getAttribute("href")).toBe("/mi-cuenta");
    expect(screen.queryByRole("button", { name: /Regístrate ahora/ })).toBeNull();
  });

  it("la franja superior aparece con la liga a Mi cuenta", async () => {
    const { default: Banner } = await import("@/components/landing/RegistrationClosedBanner");
    render(<Banner />);
    expect(screen.getByRole("status").textContent).toContain(REGISTRATION_CLOSED.banner);
    expect(screen.getByRole("link", { name: new RegExp(REGISTRATION_CLOSED.cta) }).getAttribute("href")).toBe("/mi-cuenta");
  });
});
