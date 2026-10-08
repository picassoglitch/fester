import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONTACT, FAQ, supportEmail } from "@/lib/event";
import { mailFrom, mailReplyTo } from "@/lib/mail";
import { passEmail, verificationEmail } from "@/lib/emails";

const CONTACTO = "contacto@encuentrofester.com.mx";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPPORT_EMAIL", "");
  vi.stubEnv("RESEND_REPLY_TO", "");
  vi.stubEnv("RESEND_FROM", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("correo de contacto", () => {
  it("el contacto del evento es contacto@encuentrofester.com.mx", () => {
    expect(CONTACT.email).toBe(CONTACTO);
  });

  it("supportEmail() cae en el contacto si NEXT_PUBLIC_SUPPORT_EMAIL esta vacia", () => {
    expect(supportEmail()).toBe(CONTACTO);
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_EMAIL", "   ");
    expect(supportEmail()).toBe(CONTACTO);
  });

  it("NEXT_PUBLIC_SUPPORT_EMAIL sobreescribe el contacto", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_EMAIL", "otro@example.com");
    expect(supportEmail()).toBe("otro@example.com");
  });

  it("el reply-to por defecto es el contacto", () => {
    expect(mailReplyTo()).toBe(CONTACTO);
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_EMAIL", "otro@example.com");
    expect(mailReplyTo()).toBe("otro@example.com");
    vi.stubEnv("RESEND_REPLY_TO", "respuestas@example.com");
    expect(mailReplyTo()).toBe("respuestas@example.com");
  });

  it("el remitente sigue siendo no-reply del dominio verificado", () => {
    expect(mailFrom()).toBe("Encuentro Fester <no-reply@encuentrofester.com.mx>");
  });

  it("los correos y las preguntas frecuentes mencionan el contacto", () => {
    const code = verificationEmail({ to: "a@example.com", code: "123456", purpose: "LOGIN" });
    const pass = passEmail({ to: "a@example.com", name: "Ana", code: "ABC123" });
    for (const m of [code, pass]) {
      expect(m.html).toContain(CONTACTO);
      expect(m.text).toContain(CONTACTO);
    }
    expect(FAQ.items.some((i) => JSON.stringify(i).includes(CONTACTO))).toBe(true);
  });
});
