"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/codes";
import { INDUSTRIES, POSITIONS, STATES } from "@/lib/event";

export type RegisterState = { error?: string };

function pick(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function registerAttendee(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name = pick(formData, "name");
  const company = pick(formData, "company");
  const email = pick(formData, "email");
  const phone = pick(formData, "phone");
  const position = pick(formData, "position");
  const industry = pick(formData, "industry");
  const state = pick(formData, "state");
  const privacy = formData.get("privacy") !== null;

  if (name.length < 2) return { error: "Escribe tu nombre completo." };
  if (name.length > 80) return { error: "El nombre es demasiado largo." };
  if (company.length < 2) return { error: "Escribe el nombre de tu empresa." };
  if (company.length > 100) return { error: "El nombre de la empresa es demasiado largo." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "El correo no parece válido." };
  }
  if (!/^[\d+\s()-]{7,20}$/.test(phone)) {
    return { error: "El teléfono no parece válido." };
  }
  // Los catalogos vienen de un <select>: validamos contra la lista para no
  // guardar valores manipulados desde el cliente.
  if (!POSITIONS.includes(position as (typeof POSITIONS)[number])) {
    return { error: "Selecciona tu puesto o cargo." };
  }
  if (!INDUSTRIES.includes(industry as (typeof INDUSTRIES)[number])) {
    return { error: "Selecciona el giro de tu empresa." };
  }
  if (!STATES.includes(state as (typeof STATES)[number])) {
    return { error: "Selecciona tu estado." };
  }
  if (!privacy) return { error: "Necesitamos que aceptes el aviso de privacidad." };

  const existing = await prisma.attendee.findFirst({
    where: { email: email.toLowerCase() },
    select: { code: true },
  });
  // Si ya se registro con ese correo, lo devolvemos a su pase en vez de duplicarlo.
  if (existing) redirect(`/pase/${existing.code}`);

  let code = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateCode();
    const taken = await prisma.attendee.findUnique({
      where: { code: candidate },
      select: { id: true },
    });
    if (!taken) {
      code = candidate;
      break;
    }
  }
  if (!code) return { error: "No pudimos generar tu código. Intenta de nuevo." };

  await prisma.attendee.create({
    data: {
      code,
      name,
      email: email.toLowerCase(),
      phone,
      company,
      position,
      industry,
      state,
      privacyAt: new Date(),
    },
  });

  redirect(`/pase/${code}`);
}
