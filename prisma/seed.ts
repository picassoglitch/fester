import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_STATIONS = [
  { name: "Registro", emoji: "🎟️" },
  { name: "Kiosko 1", emoji: "1️⃣" },
  { name: "Kiosko 2", emoji: "2️⃣" },
  { name: "Kiosko 3", emoji: "3️⃣" },
  { name: "Kiosko 4", emoji: "4️⃣" },
  { name: "Kiosko 5", emoji: "5️⃣" },
];

/** Sin ADMIN_PIN se genera uno al azar: este repo es publico y un PIN fijo en
 *  el codigo es un PIN conocido por cualquiera. */
function randomPin(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

async function main() {
  const configured = (process.env.ADMIN_PIN ?? "").trim();
  const pin = /^\d{4,8}$/.test(configured) ? configured : randomPin();

  const admins = await prisma.staff.count({ where: { role: "ADMIN" } });
  if (admins === 0) {
    await prisma.staff.create({
      data: { name: "Administrador", pinHash: await bcrypt.hash(pin, 10), role: "ADMIN" },
    });
    console.log(
      configured
        ? "Admin creado con el PIN de ADMIN_PIN."
        : `Admin creado. PIN generado: ${pin} (guárdalo o define ADMIN_PIN).`,
    );
  } else {
    console.log("Ya existe un admin, no se creó otro.");
  }

  const stations = await prisma.station.count();
  if (stations === 0) {
    await prisma.station.createMany({
      data: DEFAULT_STATIONS.map((station, index) => ({ ...station, order: index + 1 })),
    });
    console.log(`${DEFAULT_STATIONS.length} estaciones de ejemplo creadas.`);
  } else {
    console.log("Ya hay estaciones, no se tocaron.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
