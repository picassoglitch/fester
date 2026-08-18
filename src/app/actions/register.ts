"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { generateCode } from "@/lib/codes";

export type RegisterState = { error?: string };

export async function registerAttendee(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (name.length < 2) return { error: "Escribe tu nombre completo." };
  if (name.length > 80) return { error: "El nombre es demasiado largo." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "El correo no parece válido." };
  }
  if (phone && !/^[\d+\s()-]{7,20}$/.test(phone)) {
    return { error: "El teléfono no parece válido." };
  }

  if (email) {
    const existing = await prisma.attendee.findFirst({
      where: { email: email.toLowerCase() },
      select: { code: true },
    });
    // Si ya se registro con ese correo, lo devolvemos a su pase en vez de duplicarlo.
    if (existing) redirect(`/pase/${existing.code}`);
  }

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
      email: email ? email.toLowerCase() : null,
      phone: phone || null,
    },
  });

  redirect(`/pase/${code}`);
}
