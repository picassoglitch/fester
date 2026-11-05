/**
 * Roles de staff y a que pantallas entra cada uno. Sin Prisma: lo usa proxy.ts.
 * Escaneo (STAFF) registra estaciones; Premios (PRIZES) solo entrega premios;
 * el administrador puede todo.
 */
export type StaffRole = "STAFF" | "PRIZES" | "ADMIN";

export const STAFF_ROLES: readonly StaffRole[] = ["STAFF", "PRIZES", "ADMIN"];

export const ROLE_LABELS: Record<StaffRole, string> = {
  STAFF: "Escaneo",
  PRIZES: "Premios",
  ADMIN: "Administrador",
};

export function parseRole(value: unknown): StaffRole | null {
  return STAFF_ROLES.includes(value as StaffRole) ? (value as StaffRole) : null;
}

export function canRecordStations(role: StaffRole): boolean {
  return role === "STAFF" || role === "ADMIN";
}

export function canRedeemPrizes(role: StaffRole): boolean {
  return role === "PRIZES" || role === "ADMIN";
}

/** Pantalla de trabajo de cada rol de staff (el admin tiene ademas /admin). */
export function staffHome(role: StaffRole): string {
  return role === "PRIZES" ? "/staff/premios" : "/staff/escanear";
}

function under(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Si el rol puede abrir esa ruta. Fuera de las pantallas de staff/admin, si. */
export function canOpenPath(role: StaffRole, pathname: string): boolean {
  if (under(pathname, "/admin")) return role === "ADMIN";
  if (under(pathname, "/staff/escanear")) return canRecordStations(role);
  if (under(pathname, "/staff/premios")) return canRedeemPrizes(role);
  return true;
}

/** La pantalla de trabajo del rol, conservando el pase precargado (?code=). */
export function staffHomeWithCode(role: StaffRole, code: string | null | undefined): string {
  const home = staffHome(role);
  return code ? `${home}?code=${encodeURIComponent(code)}` : home;
}
