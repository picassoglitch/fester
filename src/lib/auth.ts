import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "fester_session";
const MAX_AGE_SECONDS = 60 * 60 * 14; // una jornada de evento

/** Cookie de la cuenta de un asistente (no de staff). */
export const ATTENDEE_COOKIE = "fester_asistente";
/** El registro abre meses antes del evento: la sesion dura lo suficiente. */
const ATTENDEE_MAX_AGE_SECONDS = 60 * 60 * 24 * 120;

export type Session = {
  id: string;
  name: string;
  role: "STAFF" | "ADMIN";
};

/** Sesion de quien ya se registro y vuelve a abrir su pase. */
export type AttendeeSession = {
  id: string;
  code: string;
  name: string;
  email: string;
};

export function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("Falta SESSION_SECRET (minimo 16 caracteres) en el entorno.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT({ name: session.name, role: session.role, scope: "staff" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    // Los dos tipos de sesion se firman con el mismo secreto: sin esta linea,
    // una cookie de asistente serviria como sesion de staff.
    if (payload.scope === "attendee") return null;
    return {
      id: payload.sub,
      name: String(payload.name ?? ""),
      role: payload.role === "ADMIN" ? "ADMIN" : "STAFF",
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(session: Session) {
  const token = await createSessionToken(session);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Sesion no valida");
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== "ADMIN") throw new Error("Se requiere rol de administrador");
  return session;
}


/* --- Cuenta del asistente: mismo secreto, cookie y scope distintos --- */

export async function createAttendeeToken(session: AttendeeSession): Promise<string> {
  return new SignJWT({
    code: session.code,
    name: session.name,
    email: session.email,
    scope: "attendee",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.id)
    .setIssuedAt()
    .setExpirationTime(`${ATTENDEE_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyAttendeeToken(token: string): Promise<AttendeeSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || payload.scope !== "attendee") return null;
    return {
      id: payload.sub,
      code: String(payload.code ?? ""),
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
    };
  } catch {
    return null;
  }
}

export async function setAttendeeSessionCookie(session: AttendeeSession) {
  const token = await createAttendeeToken(session);
  const store = await cookies();
  store.set(ATTENDEE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ATTENDEE_MAX_AGE_SECONDS,
  });
}

export async function clearAttendeeSessionCookie() {
  const store = await cookies();
  store.delete(ATTENDEE_COOKIE);
}

export async function getAttendeeSession(): Promise<AttendeeSession | null> {
  const store = await cookies();
  const token = store.get(ATTENDEE_COOKIE)?.value;
  if (!token) return null;
  return verifyAttendeeToken(token);
}
