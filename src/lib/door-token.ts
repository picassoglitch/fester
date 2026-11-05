import { SignJWT, jwtVerify } from "jose";
import { getSecret } from "@/lib/auth";

// Aldo 2026-11-05 — el QR de la puerta vale solo el 5 de noviembre en CDMX (UTC-6).
export const DOOR_SIGNUP_FROM = new Date("2026-11-05T06:00:00Z");
export const DOOR_SIGNUP_UNTIL = new Date("2026-11-06T06:00:00Z");

/** Vida de cada token: una foto del QR compartida deja de servir pronto. La pantalla lo renueva antes. */
export const DOOR_TOKEN_TTL_MS = 30 * 60_000;

export const DOOR_SCOPE = "puerta";

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

export function doorSignupOpen(now = new Date()): boolean {
  return now >= DOOR_SIGNUP_FROM && now < DOOR_SIGNUP_UNTIL;
}

/** Token del QR de autoregistro: vence a los 30 min (o al cerrar el dia del evento, lo que pase antes). */
export async function createDoorToken(now = new Date()): Promise<string> {
  const exp = Math.min(now.getTime() + DOOR_TOKEN_TTL_MS, DOOR_SIGNUP_UNTIL.getTime());
  return new SignJWT({ scope: DOOR_SCOPE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(seconds(now))
    .setNotBefore(seconds(DOOR_SIGNUP_FROM))
    .setExpirationTime(Math.floor(exp / 1000))
    .sign(getSecret());
}

export async function isValidDoorToken(token: string | null | undefined, now = new Date()): Promise<boolean> {
  if (!token || !doorSignupOpen(now)) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
      currentDate: now,
      maxTokenAge: DOOR_TOKEN_TTL_MS / 1000,
      requiredClaims: ["iat", "nbf", "exp"],
    });
    return payload.scope === DOOR_SCOPE;
  } catch {
    return false;
  }
}
