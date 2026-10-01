/**
 * Destino seguro para ?next= despues del login de staff. `startsWith("/")`
 * dejaba pasar //evil.com y /\evil.com, que el navegador trata como otro host.
 */
const BASE = "https://internal.invalid";
const ALLOWED_PREFIXES = ["/staff", "/admin"];

function decodedVariants(raw: string): string[] {
  const out = [raw];
  let current = raw;
  // Dos pasadas: atrapa tambien el doble encoding (%252F → %2F → /).
  for (let i = 0; i < 2; i++) {
    try {
      current = decodeURIComponent(current);
    } catch {
      break;
    }
    out.push(current);
  }
  return out;
}

function underAllowed(pathname: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function safeNextPath(raw: unknown, fallback = "/staff/escanear"): string {
  if (typeof raw !== "string" || raw === "") return fallback;
  // Caracteres de control o espacio al inicio: el navegador los recorta y el
  // resultado podria ser otro esquema u otro host.
  if (/^\s/.test(raw) || /[\u0000-\u001f\u007f]/.test(raw)) return fallback;

  for (const variant of decodedVariants(raw)) {
    if (variant.includes("\\") || variant.startsWith("//") || /[\u0000-\u001f\u007f]/.test(variant)) {
      return fallback;
    }
  }

  if (!raw.startsWith("/")) return fallback;

  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  if (!underAllowed(url.pathname)) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}

/** Destino final segun el rol: el staff nunca aterriza en /admin. */
export function postLoginTarget(raw: unknown, role: "STAFF" | "ADMIN"): string {
  const target = safeNextPath(raw);
  if (role === "STAFF" && (target === "/admin" || target.startsWith("/admin/") || target.startsWith("/admin?"))) {
    return "/staff/escanear";
  }
  if (role === "ADMIN" && target === "/staff/escanear") return "/admin";
  return target;
}
