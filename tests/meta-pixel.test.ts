import { describe, expect, it } from "vitest";
import { pixelAllowed } from "@/lib/meta-pixel";
import { securityHeaders } from "../next.config";

const HOST = "www.encuentrofester.com.mx";

describe("Meta Pixel", () => {
  it("carga en las paginas publicas del dominio oficial", () => {
    expect(pixelAllowed(HOST, "/")).toBe(true);
    expect(pixelAllowed(HOST, "/aviso-de-privacidad")).toBe(true);
    expect(pixelAllowed(HOST, "/mi-cuenta")).toBe(true);
  });

  it("no carga fuera del dominio oficial", () => {
    expect(pixelAllowed("fester.vercel.app", "/")).toBe(false);
    expect(pixelAllowed("localhost:3000", "/")).toBe(false);
  });

  it("no carga en rutas con el codigo del pase ni en las internas", () => {
    for (const path of ["/pase", "/pase/ABC123", "/s/ABC123", "/staff", "/staff/escanear", "/admin"]) {
      expect(pixelAllowed(HOST, path)).toBe(false);
    }
  });

  it("la CSP permite fbevents.js y el envio de eventos", () => {
    const csp = securityHeaders.find((h) => h.key === "Content-Security-Policy-Report-Only")!.value;
    expect(csp).toMatch(/script-src [^;]*https:\/\/connect\.facebook\.net/);
    expect(csp).toMatch(/img-src [^;]*https:\/\/www\.facebook\.com/);
    expect(csp).toMatch(/connect-src [^;]*https:\/\/www\.facebook\.com/);
  });
});
