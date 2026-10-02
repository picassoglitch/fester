/**
 * Mensajes en español para la validacion nativa del navegador. Sin esto un
 * navegador en ingles muestra "Please check this box…" en un sitio en español.
 * La validacion real sigue en el servidor.
 */
export type ValidityLike = Pick<
  ValidityState,
  "valueMissing" | "typeMismatch" | "rangeUnderflow" | "rangeOverflow" | "badInput" | "patternMismatch"
>;

export type FieldInfo = {
  type: string;
  name: string;
  min?: string;
  max?: string;
};

export function spanishValidityMessage(validity: ValidityLike, field: FieldInfo): string {
  if (field.type === "checkbox" && field.name === "privacy" && validity.valueMissing) {
    return "Necesitamos que aceptes el aviso de privacidad.";
  }
  if (field.name === "age" && (validity.rangeUnderflow || validity.rangeOverflow || validity.badInput)) {
    return `Tu edad debe estar entre ${field.min} y ${field.max} años.`;
  }
  if (validity.valueMissing) return "Completa este campo.";
  if (field.type === "email" && validity.typeMismatch) return "Escribe un correo válido.";
  if (validity.patternMismatch) return "Revisa el formato de este campo.";
  return "";
}

type Validatable = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function isValidatable(target: EventTarget | null): target is Validatable {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  );
}

/** Para onInvalidCapture del <form>: pone el mensaje en español. */
export function handleInvalid(event: { target: EventTarget | null }) {
  if (!isValidatable(event.target)) return;
  const el = event.target;
  const message = spanishValidityMessage(el.validity, {
    type: el.type,
    name: el.name,
    min: el instanceof HTMLInputElement ? el.min : undefined,
    max: el instanceof HTMLInputElement ? el.max : undefined,
  });
  if (message) el.setCustomValidity(message);
}

/** Para onInputCapture/onChangeCapture: limpia el mensaje para revalidar. */
export function clearCustomValidity(event: { target: EventTarget | null }) {
  if (isValidatable(event.target)) event.target.setCustomValidity("");
}
