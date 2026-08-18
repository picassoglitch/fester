"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginWithPin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const pin = String(formData.get("pin") ?? "").trim();
  const next = String(formData.get("next") ?? "/staff/escanear");

  if (!/^\d{4,8}$/.test(pin)) return { error: "El PIN debe tener entre 4 y 8 dígitos." };

  const staff = await prisma.staff.findMany({ where: { active: true } });
  let matched: (typeof staff)[number] | null = null;
  for (const person of staff) {
    if (await bcrypt.compare(pin, person.pinHash)) {
      matched = person;
      break;
    }
  }

  if (!matched) return { error: "PIN incorrecto." };

  await setSessionCookie({ id: matched.id, name: matched.name, role: matched.role });

  const safeNext = next.startsWith("/") ? next : "/staff/escanear";
  redirect(matched.role === "ADMIN" && safeNext === "/staff/escanear" ? "/admin" : safeNext);
}

export async function logout() {
  await clearSessionCookie();
  redirect("/staff");
}
