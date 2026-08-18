/**
 * Base usada dentro de los codigos QR. En Vercel se resuelve sola con VERCEL_URL,
 * pero conviene fijar NEXT_PUBLIC_APP_URL con el dominio definitivo del evento.
 */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
