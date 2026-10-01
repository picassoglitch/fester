/**
 * Reglas de PIN compartidas por el login, el alta de staff, el seed y el
 * teclado. El login sigue aceptando 4–8 digitos para que el staff con PIN
 * viejo pueda entrar hasta que se le reasigne uno.
 */
export const PIN_MIN_LOGIN = 4;
export const PIN_MAX = 8;
/** Los PIN nuevos de staff: de 6 a PIN_MAX digitos. */
export const STAFF_PIN_MIN = 6;
/** Un admin abre exportaciones con datos personales: PIN de 8 digitos exactos. */
export const ADMIN_PIN_LENGTH = 8;

export function isLoginPinFormat(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_MIN_LOGIN},${PIN_MAX}}$`).test(pin);
}

/** Valida un PIN que se va a asignar. Regresa el mensaje de error o null. */
export function newPinError(pin: string, role: "STAFF" | "ADMIN"): string | null {
  if (role === "ADMIN") {
    return new RegExp(`^\\d{${ADMIN_PIN_LENGTH}}$`).test(pin)
      ? null
      : `El PIN de un administrador debe tener ${ADMIN_PIN_LENGTH} dígitos.`;
  }
  return new RegExp(`^\\d{${STAFF_PIN_MIN},${PIN_MAX}}$`).test(pin)
    ? null
    : `El PIN debe tener entre ${STAFF_PIN_MIN} y ${PIN_MAX} dígitos.`;
}
