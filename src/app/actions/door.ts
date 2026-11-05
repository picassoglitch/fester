"use server";

import { requireSession, setAttendeeSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  DOOR_EXISTING_NOTICE,
  DOOR_RESEND_PER_HOUR,
  DOOR_SIGNUP_LIMIT,
  mailPass,
  readDoorFields,
  registerAtDoor,
  type DoorPass,
} from "@/lib/door";
import { isValidDoorToken } from "@/lib/door-token";
import { REGISTRATION_CLOSED } from "@/lib/event";
import { canRecordStations } from "@/lib/roles";
import { appUrl } from "@/lib/site";
import { doorKindOf } from "@/lib/stations";
import { clientIpHash, consumeRateLimit, hmacKey } from "@/lib/throttle";
import { recordScan } from "@/app/actions/scan";

export type DoorPassView = {
  code: string;
  name: string;
  created: boolean;
  mailFailed: boolean;
  qrValue: string;
};

export type DoorEntry =
  | { status: "entrada"; inside?: number }
  | { status: "ya-dentro"; inside?: number }
  | { status: "confirmar"; inside?: number }
  | { status: "error"; error: string };

export type WalkInState = { error?: string; pass?: DoorPassView; entry?: DoorEntry };

export type SelfSignupState = { error?: string; notice?: string; pass?: DoorPassView };

const NO_DOOR = "No tienes permiso para registrar en la puerta.";

function passView(pass: DoorPass): DoorPassView {
  const { code, name, created, mailFailed } = pass;
  return { code, name, created, mailFailed, qrValue: `${appUrl()}/s/${code}` };
}

// Aldo 2026-11-05 — la Entrada usa el mismo recordScan de la estacion Registro: aforo 450 y "Dejar pasar".
async function enter(code: string, override: boolean): Promise<DoorEntry> {
  const stations = await prisma.station.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true },
  });
  const door = stations.find((s) => doorKindOf(s.name) === "ENTRY");
  if (!door) return { status: "error", error: "No hay una estación «Registro» activa: la entrada no se marcó." };

  const outcome = await recordScan(code, door.id, override);
  if (!outcome.ok) return { status: "error", error: outcome.error };
  if (outcome.status === "confirmar") return { status: "confirmar", inside: outcome.inside };
  if (outcome.status === "repetido") return { status: "ya-dentro", inside: outcome.inside };
  return { status: "entrada", inside: outcome.inside };
}

/** Staff en la puerta: crea (o encuentra) el pase y marca la Entrada. */
export async function registerWalkIn(_prev: WalkInState, formData: FormData): Promise<WalkInState> {
  const session = await requireSession();
  if (!canRecordStations(session.role)) return { error: NO_DOOR };

  const fields = readDoorFields(formData);
  if ("error" in fields) return { error: fields.error };
  const pass = await registerAtDoor(fields);
  if ("error" in pass) return { error: pass.error };

  return { pass: passView(pass), entry: await enter(pass.code, false) };
}

/** "Dejar pasar" o reintento de la Entrada de un pase recien mostrado. */
export async function admitWalkIn(code: string, override: boolean): Promise<DoorEntry> {
  const session = await requireSession();
  if (!canRecordStations(session.role)) return { status: "error", error: NO_DOOR };
  return enter(code, override);
}

/** La persona se registra sola con el QR de la puerta. No marca Entrada: la escanean al pasar. */
export async function selfRegisterAtDoor(_prev: SelfSignupState, formData: FormData): Promise<SelfSignupState> {
  // Sin token valido es el registro publico, que sigue cerrado (tambien para un POST directo).
  if (!(await isValidDoorToken(String(formData.get("t") ?? "")))) return { error: REGISTRATION_CLOSED.error };

  const fields = readDoorFields(formData);
  if ("error" in fields) return { error: fields.error };

  const limit = await consumeRateLimit(
    `puerta:ip:${await clientIpHash()}`,
    DOOR_SIGNUP_LIMIT.perIp,
    DOOR_SIGNUP_LIMIT.windowMs,
  );
  if (!limit.allowed) return { error: "Demasiados registros desde esta red. Pide ayuda al staff de la entrada." };

  const pass = await registerAtDoor(fields);
  if ("error" in pass) return { error: pass.error };

  if (pass.created) {
    await setAttendeeSessionCookie({ id: pass.id, code: pass.code, name: pass.name, email: fields.email });
    return { pass: passView(pass) };
  }

  // Quien tiene el QR no probo que el correo sea suyo: el pase existente solo viaja a ese correo.
  const resend = await consumeRateLimit(`puerta:reenvio:${hmacKey(fields.email)}`, DOOR_RESEND_PER_HOUR, 60 * 60_000);
  if (resend.allowed) await mailPass(fields.email, pass.name, pass.code);
  return { notice: DOOR_EXISTING_NOTICE };
}
