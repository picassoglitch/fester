import { CANONICAL_HOST } from "@/lib/site";

export const META_PIXEL_ID = "1418501203799658";

/**
 * Rutas donde no se carga el pixel: /pase y /s llevan el codigo del pase en la
 * URL (es la credencial del QR) y el pixel manda la URL completa a Meta; /staff
 * y /admin son internas.
 */
const EXCLUDED_PREFIXES = ["/pase", "/s/", "/staff", "/admin"];

export function pixelAllowed(host: string, pathname: string): boolean {
  if (host !== CANONICAL_HOST) return false;
  return !EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

type Fbq = (...args: unknown[]) => void;

/** Manda un evento estandar si el pixel esta cargado; si no, no hace nada. */
export function trackPixel(event: string, params?: Record<string, unknown>): void {
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (fbq) fbq("track", event, params);
}
