"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth";
import { isLoginPinFormat, PIN_MAX, PIN_MIN_LOGIN } from "@/lib/pin";
import { clientIpHash, guardPinAttempt, lockMessage } from "@/lib/throttle";

export type LoginState = { error?: string };

export async function loginWithPin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get("pin") ?? "").trim();
  const next = String(formData.get("next") ?? "/staff/escanear");

  if (!isLoginPinFormat(pin)) {
    return { error: `El PIN debe tener entre ${PIN_MIN_LOGIN} y ${PIN_MAX} dígitos.` };
  }

  // El bloqueo se revisa antes de cualquier bcrypt: cada intento compara contra
  // todo el staff activo y sin limite seria fuerza bruta y DoS a la vez.
  const result = await guardPinAttempt({
    ipHash: await clientIpHash(),
    attempt: async () => {
      const staff = await prisma.staff.findMany({ where: { active: true } });
      for (const person of staff) {
        if (await bcrypt.compare(pin, person.pinHash)) return person;
      }
      return null;
    },
  });

  if (result.status === "locked") return { error: lockMessage(result.until, new Date()) };
  if (result.status === "failed") return { error: "PIN incorrecto." };

  const matched = result.value;
  await setSessionCookie({
    id: matched.id,
    name: matched.name,
    role: matched.role,
    sessionVersion: matched.sessionVersion,
  });

  const safeNext = next.startsWith("/") ? next : "/staff/escanear";
  redirect(matched.role === "ADMIN" && safeNext === "/staff/escanear" ? "/admin" : safeNext);
}

export async function logout() {
  await clearSessionCookie();
  redirect("/staff");
}
