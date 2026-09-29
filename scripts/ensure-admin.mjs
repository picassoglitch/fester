/**
 * Deja al administrador listo antes de compilar.
 *
 * El seed (prisma/seed.ts) solo corre a mano: en Vercel el build nunca lo
 * ejecutaba, asi que en una base recien creada no habia ningun Staff y el panel
 * contestaba "PIN incorrecto" a cualquier PIN, incluido el del seed.
 *
 * Con esto ADMIN_PIN es la unica fuente de verdad del PIN de administrador:
 * se define en el entorno (en Vercel) y cada despliegue lo deja aplicado. Para
 * cambiarlo se cambia la variable y se vuelve a desplegar, o se corre a mano
 * con "npm run staff:pin".
 *
 * Sin ADMIN_PIN no hace nada, para no tocar una base que ya esta bien.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/** Nombre del Staff que administra este script. Al resto no lo toca. */
const ADMIN_NAME = "Administrador";

const url = process.env.DATABASE_URL;
const pin = (process.env.ADMIN_PIN ?? "").trim();

if (!url) {
  console.log("[admin] Sin DATABASE_URL: se omite.");
  process.exit(0);
}

if (!pin) {
  console.log("[admin] Sin ADMIN_PIN: se omite (nadie toca el PIN actual).");
  process.exit(0);
}

if (!/^\d{4,8}$/.test(pin)) {
  console.error("[admin] ADMIN_PIN debe ser de 4 a 8 digitos. No se aplico nada.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const existing = await prisma.staff.findFirst({ where: { name: ADMIN_NAME } });

  if (!existing) {
    await prisma.staff.create({
      data: { name: ADMIN_NAME, pinHash: await bcrypt.hash(pin, 10), role: "ADMIN", active: true },
    });
    // El PIN nunca se imprime: los logs de build se pueden leer.
    console.log(`[admin] "${ADMIN_NAME}" creado con el PIN de ADMIN_PIN.`);
  } else if (
    !(await bcrypt.compare(pin, existing.pinHash)) ||
    existing.role !== "ADMIN" ||
    !existing.active
  ) {
    await prisma.staff.update({
      where: { id: existing.id },
      data: { pinHash: await bcrypt.hash(pin, 10), role: "ADMIN", active: true },
    });
    console.log(`[admin] "${ADMIN_NAME}" actualizado con el PIN de ADMIN_PIN.`);
  } else {
    console.log(`[admin] "${ADMIN_NAME}" ya estaba al dia.`);
  }
} catch (error) {
  console.error("[admin] No se pudo dejar listo el administrador:", error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
