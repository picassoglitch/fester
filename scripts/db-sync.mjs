/**
 * Aplica el esquema de Prisma a la base antes de compilar.
 *
 * Vercel sí tiene la cadena de conexión en el entorno del build, así que el
 * deploy deja la base al día solo. Sin esto hay que correr "prisma db push" a
 * mano, y si alguien lo olvida la app queda pidiendo columnas que no existen.
 *
 * Si no hay DATABASE_URL (por ejemplo en un build local de prueba) no hace
 * nada. Si la hay y el push falla, el build falla: es preferible a desplegar
 * código que la base no puede responder.
 */
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL;

if (!url) {
  console.log("[db-sync] Sin DATABASE_URL: se omite la sincronización del esquema.");
  process.exit(0);
}

// "prisma db push" usa directUrl. En Vercel normalmente solo está DATABASE_URL,
// así que se reusa esa misma cadena.
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = url;
  console.log("[db-sync] DIRECT_URL no definida: se usa DATABASE_URL.");
}

console.log("[db-sync] Sincronizando el esquema…");
execSync("prisma db push --skip-generate", { stdio: "inherit", env: process.env });
console.log("[db-sync] Esquema al día.");
