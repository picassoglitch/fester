import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { resolveSeedAdminPin } from "../src/lib/pin";
import { DEFAULT_STATIONS } from "../src/lib/stations";

const prisma = new PrismaClient();

async function main() {
  // Se valida antes de escribir nada en la base.
  const pin = resolveSeedAdminPin(process.env.ADMIN_PIN);

  const admins = await prisma.staff.count({ where: { role: "ADMIN" } });
  if (admins === 0) {
    await prisma.staff.create({
      data: { name: "Administrador", pinHash: await bcrypt.hash(pin, 10), role: "ADMIN" },
    });
    console.log("Admin creado con el PIN de ADMIN_PIN.");
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
