// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { LegalBlock } from "@/components/LegalDocument";
import { TERMS, TERMS_PATH } from "@/lib/terms";
import { INDUSTRIES, POSITIONS, PRIVACY_PATH, REFERRAL_SOURCES, STATES } from "@/lib/event";

const issueEmailCode = vi.fn(async () => ({ ok: true as const }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/auth", () => ({ setAttendeeSessionCookie: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/mail", () => ({ sendMail: vi.fn() }));
vi.mock("@/lib/throttle", () => ({ clientIpHash: vi.fn(async () => "iphash") }));
// Estas pruebas cubren el formulario con el registro abierto; el cierre se prueba en registro-cerrado.test.tsx.
vi.mock("@/lib/event", async (orig) => ({ ...(await orig<typeof import("@/lib/event")>()), REGISTRATION_OPEN: true }));
vi.mock("@/lib/verification", async (orig) => ({
  ...(await orig<typeof import("@/lib/verification")>()),
  issueEmailCode,
}));

afterEach(cleanup);

const SECTION_TITLES = [
  "Identificación del evento y del organizador",
  "Acceso gratuito",
  "Registro individual previo",
  "Aforo y fila de ingreso",
  "Validación y reingreso",
  "Público objetivo y accesibilidad",
  "Seguridad y evento sin alcohol",
  "Experiencia de realidad virtual",
  "Alimentos",
  "Regalos",
  "Sorteos",
  "Datos personales",
  "Cobertura audiovisual y uso de imagen",
  "Cambios suspensión y cancelación",
  "Responsabilidad y pertenencias",
  "Aceptación y atención de controversias",
];

describe("términos y condiciones", () => {
  it("tiene las 16 secciones del documento aprobado, en orden", () => {
    const titles = TERMS.blocks.filter((block) => block.kind === "h2").map((block) => block.text);
    expect(titles).toEqual(SECTION_TITLES);
  });

  it("no publica marcadores sin llenar y la sección 14 nombra los canales aprobados", () => {
    const text = [
      TERMS.lead,
      TERMS.intro,
      ...(TERMS.blocks as readonly LegalBlock[]).map((block) =>
        "text" in block ? block.text : block.items.join("\n"),
      ),
    ].join("\n");
    expect(text).not.toMatch(/\[[A-ZÁÉÍÓÚÑ ]+\]/);
    expect(text).toContain(
      "por el sitio https://www.encuentrofester.com.mx, el correo contacto@encuentrofester.com.mx y a los contactos registrados",
    );
  });

  it("la página muestra el índice y enlaza correos y URLs", async () => {
    const { default: TermsPage } = await import("@/app/terminos-y-condiciones/page");
    const { container } = render(<TermsPage />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Términos y condiciones");
    const nav = screen.getByRole("navigation", { name: "Contenido de los términos" });
    expect(nav.querySelectorAll("li")).toHaveLength(16);
    expect(container.querySelectorAll("article h2")).toHaveLength(16);
    expect(container.querySelector('article a[href="mailto:contacto@encuentrofester.com.mx"]')).not.toBeNull();
    for (const link of Array.from(nav.querySelectorAll("a"))) {
      const href = link.getAttribute("href")!;
      expect(href).toMatch(/^#[a-z0-9-]+$/);
      expect(container.querySelector(`article ${href}`)).not.toBeNull();
    }
    expect(container.querySelector('a[href="https://www.encuentrofester.com.mx/aviso-de-privacidad"]')).not.toBeNull();
  });
});

describe("casilla de aceptación del registro", () => {
  it("enlaza los términos y el aviso de privacidad y es obligatoria", async () => {
    const { default: RegisterForm } = await import("@/components/RegisterForm");
    const { container } = render(<RegisterForm />);
    const checkbox = container.querySelector('input[name="privacy"]') as HTMLInputElement;
    expect(checkbox.required).toBe(true);
    const label = checkbox.closest("label")!;
    const hrefs = Array.from(label.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual([TERMS_PATH, PRIVACY_PATH]);
    // Abrir los documentos en la misma pestaña borraria lo ya capturado.
    for (const link of Array.from(label.querySelectorAll("a"))) expect(link.target).toBe("_blank");
    expect(label.textContent).toContain("Acepto los términos y condiciones, el aviso de privacidad");
  });
});

function registration(accepted: boolean, age = "30") {
  const data = new FormData();
  data.set("name", "Ana Pérez");
  data.set("company", "Constructora Ñandú");
  data.set("email", "ana@example.com");
  data.set("phone", "55 1234 5678");
  data.set("position", POSITIONS[0]);
  data.set("industry", INDUSTRIES[0]);
  data.set("state", STATES[0]);
  data.set("age", age);
  data.set("referral", REFERRAL_SOURCES[0]);
  data.set("stage", "form");
  if (accepted) data.set("privacy", "on");
  return data;
}

describe("registerAttendee", () => {
  it("rechaza el registro sin aceptar términos y aviso", async () => {
    const { registerAttendee } = await import("@/app/actions/register");
    issueEmailCode.mockClear();
    const state = await registerAttendee({}, registration(false));
    expect(state).toEqual({
      error: "Necesitamos que aceptes los términos y condiciones y el aviso de privacidad.",
    });
    expect(issueEmailCode).not.toHaveBeenCalled();
  });

  it("con la casilla marcada sigue al paso del código", async () => {
    const { registerAttendee } = await import("@/app/actions/register");
    issueEmailCode.mockClear();
    const state = await registerAttendee({}, registration(true));
    expect(state.stage).toBe("verify");
    expect(issueEmailCode).toHaveBeenCalledTimes(1);
  });

  // Seccion 6 de los TyC: solo mayores de 18; a menores no se les emite pase.
  it("rechaza menores de 18 y acepta 18 cumplidos", async () => {
    const { registerAttendee } = await import("@/app/actions/register");
    issueEmailCode.mockClear();
    const minor = await registerAttendee({}, registration(true, "17"));
    expect(minor).toEqual({ error: "Escribe tu edad (entre 18 y 99 años)." });
    expect(issueEmailCode).not.toHaveBeenCalled();
    const adult = await registerAttendee({}, registration(true, "18"));
    expect(adult.stage).toBe("verify");
  });
});
