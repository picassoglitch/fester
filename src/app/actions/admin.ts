"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { syncCompletion } from "@/lib/attendee";
import { markCompletedAttendees } from "@/lib/stations";
import { newPinError } from "@/lib/pin";

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

/**
 * Activar, desactivar o borrar una estacion. La pagina pide confirmacion antes
 * (confirm=1) y manda el estado al que se quiere llegar, para que un doble clic
 * o una pestaña vieja no la regresen al estado anterior.
 *
 * Despues solo se MARCAN completos los que ya tienen todas las activas (una
 * sentencia); nadie que ya completo se reabre y el premio no se toca.
 */
export async function toggleStation(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "1";
  if (!id || String(formData.get("confirm") ?? "") !== "1") return;

  const { count } = await prisma.station.updateMany({ where: { id }, data: { active } });
  if (count === 0) return;
  await markCompletedAttendees();

  revalidatePath("/admin/estaciones");
  revalidatePath("/admin");
  revalidatePath("/");
}

const DELETE_WITH_SCANS_ERROR =
  "Esta estación ya tiene escaneos y borrarla los borraría también. Desactívala en su lugar.";

/** Solo se borran estaciones sin escaneos: los Scan se borran en cascada con la estacion. */
export async function deleteStation(formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id || String(formData.get("confirm") ?? "") !== "1") return {};

  // La condicion va en el mismo DELETE: un escaneo que llegue entre la lectura
  // y el borrado tambien lo frena.
  const { count } = await prisma.station.deleteMany({ where: { id, scans: { none: {} } } });
  if (count === 0) {
    const exists = await prisma.station.count({ where: { id } });
    return exists ? { error: DELETE_WITH_SCANS_ERROR } : {};
  }
  await markCompletedAttendees();

  revalidatePath("/admin/estaciones");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: "Estación eliminada." };
}

/* ------------------------------------ staff ----------------------------------- */

export async function createStaff(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const role = String(formData.get("role") ?? "STAFF") === "ADMIN" ? "ADMIN" : "STAFF";

  if (name.length < 2) return { error: "Escribe el nombre de la persona." };
  const pinError = newPinError(pin, role);
  if (pinError) return { error: pinError };

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
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const person = await prisma.staff.findUnique({ where: { id }, select: { active: true, role: true } });
  if (!person) return;

  // Nadie se queda sin panel: ni la propia cuenta ni el ultimo admin activo.
  if (person.active) {
    const lastAdmin =
      person.role === "ADMIN" &&
      (await prisma.staff.count({ where: { role: "ADMIN", active: true } })) <= 1;
    if (id === session.id || lastAdmin) redirect("/admin/staff?aviso=desactivar");
  }

  // sessionVersion sube: la sesion abierta de quien se desactiva deja de valer.
  await prisma.staff.update({
    where: { id },
    data: { active: !person.active, sessionVersion: { increment: 1 } },
  });
  revalidatePath("/admin/staff");
}

export async function resetStaffPin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const pin = String(formData.get("pin") ?? "").trim();
  const target = await prisma.staff.findUnique({ where: { id }, select: { role: true } });
  if (!target) return { error: "No encontramos a esa persona." };
  const pinError = newPinError(pin, target.role);
  if (pinError) return { error: pinError };

  const others = await prisma.staff.findMany({
    where: { id: { not: id } },
    select: { pinHash: true },
  });
  for (const person of others) {
    if (await bcrypt.compare(pin, person.pinHash)) return { error: "Ese PIN ya está en uso." };
  }

  await prisma.staff.update({
    where: { id },
    data: { pinHash: await bcrypt.hash(pin, 10), sessionVersion: { increment: 1 } },
  });
  revalidatePath("/admin/staff");
  return { ok: "PIN actualizado." };
}

/* ---------------------------------- asistentes -------------------------------- */

export async function undoScan(formData: FormData) {
  await requireAdmin();
  const scanId = String(formData.get("scanId") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!scanId) return;

  const scan = await prisma.scan.delete({
    where: { id: scanId },
    select: { attendeeId: true, attendee: { select: { completedAt: true } } },
  });
  // Unico camino que reabre un pase. El premio (redeemedAt) no se toca.
  const completedAt = await syncCompletion(scan.attendeeId, { reopen: true });

  revalidatePath(`/admin/asistentes/${code}`);
  revalidatePath("/admin");
  if (scan.attendee.completedAt && !completedAt) {
    redirect(`/admin/asistentes/${encodeURIComponent(code)}?aviso=reabierto`);
  }
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
