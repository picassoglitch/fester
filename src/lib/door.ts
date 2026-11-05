import { prisma } from "@/lib/db";
import { passEmail } from "@/lib/emails";
import { sendMail } from "@/lib/mail";
import { normalizeEmail } from "@/lib/verification";
import { createAttendee, emailError, nameError, parsePosition, pick, type FieldError } from "@/lib/registration";

export type DoorFields = { name: string; email: string; position: string };

export type DoorPass = {
  id: string;
  code: string;
  name: string;
  /** false: el correo ya tenia pase y se muestra ese. */
  created: boolean;
  /** El pase existe, pero el correo con el pase no salio. */
  mailFailed: boolean;
};

/** Los tres campos de la puerta (correo, nombre y puesto) con las reglas del formulario web. */
export function readDoorFields(formData: FormData): DoorFields | FieldError {
  const email = pick(formData, "email");
  const name = pick(formData, "name");
  const badEmail = emailError(email);
  if (badEmail) return { error: badEmail };
  const badName = nameError(name);
  if (badName) return { error: badName };
  const position = parsePosition(pick(formData, "position"), pick(formData, "positionOther"));
  if (typeof position !== "string") return position;
  return { name, email: normalizeEmail(email), position };
}

// Aldo 2026-11-05 — en la puerta no hay codigo por correo; si el correo ya tiene pase se muestra ese.
export async function registerAtDoor(fields: DoorFields): Promise<DoorPass | FieldError> {
  const existing = await prisma.attendee.findFirst({
    where: { email: fields.email },
    orderBy: { createdAt: "asc" },
    select: { id: true, code: true, name: true },
  });
  if (existing) return { ...existing, created: false, mailFailed: false };

  const created = await createAttendee({ ...fields, origin: "PUERTA" });
  if (!created) return { error: "No pudimos generar el código del pase. Intenta de nuevo." };

  // El pase ya existe: si el correo falla se avisa en pantalla, sin borrar ni frenar el registro.
  const delivered = await mailPass(fields.email, fields.name, created.code);
  return { id: created.id, code: created.code, name: fields.name, created: true, mailFailed: !delivered };
}

/** Manda el correo del pase; nunca lanza. false si no salio. */
export async function mailPass(to: string, name: string, code: string): Promise<boolean> {
  try {
    const delivered = await sendMail(passEmail({ to, name, code }));
    if (delivered.ok) return true;
    console.error(`[puerta] No se pudo enviar el pase ${code}: ${delivered.error}`);
  } catch (error) {
    console.error(`[puerta] No se pudo enviar el pase ${code}:`, error);
  }
  return false;
}

/** Registros por IP cada 10 min en el QR de la puerta: holgado porque la red del recinto se comparte. */
export const DOOR_SIGNUP_LIMIT = { perIp: 20, windowMs: 10 * 60_000 };

/** Reenvios del pase al mismo correo por hora desde el QR de la puerta. */
export const DOOR_RESEND_PER_HOUR = 3;

export const DOOR_EXISTING_NOTICE =
  "Este correo ya tiene pase; te lo reenviamos a tu correo. Si no te llega, pide ayuda al staff.";
