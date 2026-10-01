import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("next.config headers", () => {
  it("manda los encabezados de seguridad en todas las rutas", async () => {
    const rules = await nextConfig.headers!();
    const all = rules.find((r) => r.source === "/:path*" && !r.missing);
    const byKey = Object.fromEntries(all!.headers.map((h) => [h.key, h.value]));
    for (const key of [
      "Content-Security-Policy",
      "Content-Security-Policy-Report-Only",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]) {
      expect(byKey).toHaveProperty(key);
    }
    expect(byKey["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Permissions-Policy"]).toContain("camera=(self)");
    expect(byKey).not.toHaveProperty("Strict-Transport-Security");
  });

  it("no anuncia x-powered-by", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});

describe("X-Robots-Tag fuera del dominio oficial", () => {
  it("tiene la regla missing host", async () => {
    const rules = await nextConfig.headers!();
    const rule = rules.find((r) => r.missing);
    expect(rule).toMatchObject({
      source: "/:path*",
      missing: [{ type: "host", value: "www.encuentrofester.com.mx" }],
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    });
  });
});
