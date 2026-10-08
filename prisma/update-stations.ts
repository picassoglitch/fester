/**
 * Crea las estaciones de ejemplo (DEFAULT_STATIONS) que falten.
 *
 *   npx tsx prisma/update-stations.ts
 *
 * La lista real se administra en /admin/estaciones. Este script solo agrega las
 * de ejemplo que no existan, al final del orden. Nunca desactiva, reactiva,
 * reordena ni borra estaciones: las creadas en el admin se quedan como estan.
 * Es idempotente: se puede correr las veces que haga falta.
 */
import { PrismaClient } from "@prisma/client";
import { ensureDefaultStations } from "../src/lib/stations";

const prisma = new PrismaClient();

async function main() {
  const creadas = await ensureDefaultStations(prisma);
  for (const nombre of creadas) console.log(`+ ${nombre}`);
  if (creadas.length === 0) console.log("No faltaba ninguna estación de ejemplo.");

  const activas = await prisma.station.count({ where: { active: true } });
  console.log(`\nListo: ${activas} estaciones activas (no se tocó ninguna existente).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
