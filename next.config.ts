import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Politica estricta en modo Report-Only: los scripts inline de arranque de Next
 * necesitan nonces (todas las paginas se vuelven dinamicas) o hashes antes de
 * poder exigirla. Mientras tanto solo reporta en la consola del navegador.
 * 'unsafe-eval' solo en desarrollo (lo usa React dev).
 */
const reportOnlyCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
].join("; ");

export const securityHeaders = [
  // frame-ancestors va en la politica exigida: en Report-Only el navegador la ignora.
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  { key: "Content-Security-Policy-Report-Only", value: reportOnlyCsp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // camera=(self): el escaner de QR del staff usa la camara.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

// HSTS no va aqui: Vercel ya lo manda y se duplicaria.
const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
