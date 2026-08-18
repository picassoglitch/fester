"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { syncCompletion } from "@/lib/attendee";

export type ActionState = { error?: string; ok?: string };

/* ---------------------------------- estaciones --------------------------------- */

export async function createStation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim() || "⭐";
  if (name.length < 2) return { error: "Escribe el nombre de la estación." };

  const last = await prisma.station.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
  await prisma.station.create({
    data: { name, emoji: [...emoji][0] ?? "⭐", order: (last?.order ?? 0) + 1 },
  });

  revalidatePath("/admin/estaciones");
  revalidatePath("/");
  return { ok: `Estación "${name}" creada.` };
}

export async function renameStation(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "").trim();
  if (!id || name.length < 2) return;

  await prisma.station.update({
    data: { name, emoji: [...emoji][0] ?? "⭐" },
    where: { id },
  });
  revalidatePath("/admin/estaciones");
}

export async function moveStation(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "") === "up" ? -1 : 1;

  const stations = await prisma.station.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  const index = stations.findIndex((s) => s.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= stations.length) return;

  const reordered = [...stations];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  await prisma.$transaction(
    reordered.map((station, position) =>
      prisma.station.update({ where: { id: station.id }, data: { order: position + 1 } }),
    ),
  );
  revalidatePath("/admin/estaciones");
  revalidatePath("/");
}

export async function toggleStation(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const station = await prisma.station.findUnique({ where: { id }, select: { active: true } });
  if (!station) return;

  await prisma.station.update({ where: { id }, data: { active: !station.active } });

  // Activar o desactivar una estacion cambia quien esta "completo".
  const attendees = await prisma.attendee.findMany({ select: { id: true } });
  for (const attendee of attendees) await syncCompletion(attendee.id);

  revalidatePath("/admin/estaciones");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteStation(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.station.delete({ where: { id } });
  const attendees = await prisma.attendee.findMany({ select: { id: true } });
  for (const attendee of attendees) await syncCompletion(attendee.id);

  revalidatePath("/admin/estaciones");
  revalidatePath("/admin");
  revalidatePath("/");
}

/* ------------------------------------ staff ----------------------------------- */

export async function createStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const role = String(formData.get("role") ?? "STAFF") === "ADMIN" ? "ADMIN" : "STAFF";

  if (name.length < 2) return { error: "Escribe el nombre de la persona." };
  if (!/^\d{4,8}$/.test(pin)) return { error: "El PIN debe tener entre 4 y 8 dígitos." };

  // Los PIN identifican por si solos, asi que no puede haber dos iguales.
  const everyone = await prisma.staff.findMany({ select: { pinHash: true } });
  for (const person of everyone) {
    if (await bcrypt.compare(pin, person.pinHash)) return { error: "Ese PIN ya está en uso." };
  }

  await prisma.staff.create({ data: { name, pinHash: await bcrypt.hash(pin, 10), role } });
  revalidatePath("/admin/staff");
  return { ok: `${name} puede entrar con ese PIN.` };
}

export async function toggleStaff(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const person = await prisma.staff.findUnique({ where: { id }, select: { active: true } });
  if (!person) return;

  await prisma.staff.update({ where: { id }, data: { active: !person.active } });
  revalidatePath("/admin/staff");
}

export async function resetStaffPin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const pin = String(formData.get("pin") ?? "").trim();
  if (!/^\d{4,8}$/.test(pin)) return { error: "El PIN debe tener entre 4 y 8 dígitos." };

  const others = await prisma.staff.findMany({
    where: { id: { not: id } },
    select: { pinHash: true },
  });
  for (const person of others) {
    if (await bcrypt.compare(pin, person.pinHash)) return { error: "Ese PIN ya está en uso." };
  }

  await prisma.staff.update({ where: { id }, data: { pinHash: await bcrypt.hash(pin, 10) } });
  revalidatePath("/admin/staff");
  return { ok: "PIN actualizado." };
}

/* ---------------------------------- asistentes -------------------------------- */

export async function undoScan(formData: FormData) {
  await requireAdmin();
  const scanId = String(formData.get("scanId") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!scanId) return;

  const scan = await prisma.scan.delete({ where: { id: scanId }, select: { attendeeId: true } });
  await syncCompletion(scan.attendeeId);

  revalidatePath(`/admin/asistentes/${code}`);
  revalidatePath("/admin");
}

export async function setPrizeState(formData: FormData) {
  const session = await requireAdmin();
  const code = String(formData.get("code") ?? "");
  const deliver = String(formData.get("deliver") ?? "") === "1";

  const attendee = await prisma.attendee.findUnique({ where: { code }, select: { id: true } });
  if (!attendee) return;

  await prisma.attendee.update({
    where: { id: attendee.id },
    data: deliver
      ? { redeemedAt: new Date(), redeemedById: session.id }
      : { redeemedAt: null, redeemedById: null },
  });

  revalidatePath(`/admin/asistentes/${code}`);
  revalidatePath("/admin");
}

export async function deleteAttendee(formData: FormData) {
  await requireAdmin();
  const code = String(formData.get("code") ?? "");
  if (!code) return;

  await prisma.attendee.delete({ where: { code } });
  revalidatePath("/admin/asistentes");
  revalidatePath("/admin");
  redirect("/admin/asistentes");
}
