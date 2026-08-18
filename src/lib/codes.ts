// Alfabeto sin caracteres ambiguos (0/O, 1/I/L, S/5) para dictar codigos en voz alta.
const ALPHABET = "23456789ABCDEFGHJKMNPQRTUVWXYZ";

export function generateCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/**
 * Acepta lo que sea que devuelva el lector: el codigo pelado, la URL completa
 * del QR (`https://.../s/ABC123`) o el codigo con espacios/guiones.
 */
export function normalizeCode(raw: string): string {
  let value = raw.trim();
  if (value.includes("/")) {
    const parts = value.split(/[?#]/)[0].split("/").filter(Boolean);
    value = parts[parts.length - 1] ?? "";
  }
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function isValidCode(value: string): boolean {
  return /^[A-Z0-9]{4,12}$/.test(value);
}
