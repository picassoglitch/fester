import { SignJWT, jwtVerify } from "jose";
import { getSecret } from "@/lib/auth";

// Aldo 2026-11-05 — el QR de la puerta vale solo el dia del evento: fin del 5 de noviembre en CDMX (UTC-6).
export const DOOR_SIGNUP_UNTIL = new Date("2026-11-06T06:00:00Z");

export const DOOR_SCOPE = "puerta";

/** Token del QR que el staff muestra para que la persona se registre sola en la puerta. */
export async function createDoorToken(): Promise<string> {
  return new SignJWT({ scope: DOOR_SCOPE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(DOOR_SIGNUP_UNTIL.getTime() / 1000))
    .sign(getSecret());
}

export async function isValidDoorToken(token: string | null | undefined, now = new Date()): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"], currentDate: now });
    return payload.scope === DOOR_SCOPE;
  } catch {
    return false;
  }
}
