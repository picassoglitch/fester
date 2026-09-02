/**
 * Deja las estaciones activas exactamente como la lista de abajo.
 *
 *   npx tsx prisma/update-stations.ts
 *
 * Es idempotente: se puede correr las veces que haga falta. Las estaciones que
 * ya no van NO se borran, se desactivan: asi no se pierden los escaneos que
 * hayan quedado registrados (borrarlas los borraria en cascada). Una estacion
 * inactiva desaparece de la landing y de los pases.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ESTACIONES = [
  { name: "Registro", emoji: "🎟️" },
  { name: "Experiencia inmersiva", emoji: "🥽" },
  { name: "Juegos", emoji: "🎯" },
  { name: "Comida", emoji: "🍽️" },
  { name: "Zona lounge", emoji: "🛋️" },
  { name: "Cierre", emoji: "🏁" },
];

async function main() {
  const existentes = await prisma.station.findMany();
  const deseadas = new Set(ESTACIONES.map((e) => e.name.toLowerCase()));

  for (const [index, estacion] of ESTACIONES.entries()) {
    const previa = existentes.find(
      (e) => e.name.toLowerCase() === estacion.name.toLowerCase(),
    );
    if (previa) {
      await prisma.station.update({
        where: { id: previa.id },
        data: { emoji: estacion.emoji, order: index + 1, active: true },
      });
      console.log(`= ${estacion.name}`);
    } else {
      await prisma.station.create({
        data: { ...estacion, order: index + 1, active: true },
      });
      console.log(`+ ${estacion.name}`);
    }
  }

  for (const previa of existentes) {
    if (!deseadas.has(previa.name.toLowerCase()) && previa.active) {
      await prisma.station.update({ where: { id: previa.id }, data: { active: false } });
      console.log(`- ${previa.name} (desactivada, sus escaneos se conservan)`);
    }
  }

  const activas = await prisma.station.count({ where: { active: true } });
  console.log(`\nListo: ${activas} estaciones activas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
