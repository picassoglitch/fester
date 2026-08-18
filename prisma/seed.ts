import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_STATIONS = [
  { name: "Registro", emoji: "🎟️" },
  { name: "Cata", emoji: "🍷" },
  { name: "Cabina de fotos", emoji: "📸" },
  { name: "Juegos", emoji: "🎯" },
  { name: "Zona lounge", emoji: "🛋️" },
  { name: "Cierre", emoji: "🏁" },
];

async function main() {
  const pin = process.env.ADMIN_PIN || "482913";

  const admins = await prisma.staff.count({ where: { role: "ADMIN" } });
  if (admins === 0) {
    await prisma.staff.create({
      data: { name: "Administrador", pinHash: await bcrypt.hash(pin, 10), role: "ADMIN" },
    });
    console.log(`Admin creado. PIN: ${pin}`);
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
