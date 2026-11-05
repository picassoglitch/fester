// Fester 2026-11-05 — carga la columna «Perfil» de REGISTROS en DATABASE_URL (define el brazalete al escanear).
// Uso: npx tsx scripts/importar-perfiles.ts "<archivo.xlsx>" [--aplicar]  (sin --aplicar solo muestra)
import readXlsxFile from "read-excel-file/node";
import { PrismaClient } from "@prisma/client";
import { braceletFor } from "../src/lib/bracelet";
import { profilesFromSheets } from "../src/lib/fester-profiles";
import { applyFesterProfiles } from "../src/lib/fester-profiles-apply";

async function main() {
  const file = process.argv[2];
  const apply = process.argv.includes("--aplicar");
  if (!file) throw new Error('Falta la ruta: npx tsx scripts/importar-perfiles.ts "archivo.xlsx" [--aplicar]');

  const list = profilesFromSheets(await readXlsxFile(file));
  if (!list.ok) throw new Error(list.error);
  const host = new URL(process.env.DATABASE_URL ?? "postgresql://sin-base").hostname;
  console.log(`Hoja ${list.sheet}: ${list.rows.length} filas con perfil, ${list.blank} sin perfil. Base: ${host}`);

  const db = new PrismaClient();
  try {
    const result = await applyFesterProfiles(db, list.rows, { apply });
    if (!result.ok) throw new Error(result.error);
    console.log(`Con pase: ${result.updated} (${result.byEmail} por correo). Sin pase: ${result.notFound.length}.`);
    const byColor: Record<string, number> = {};
    for (const [profile, n] of Object.entries(result.perProfile)) {
      const color = braceletFor(profile)?.color ?? `REVISAR (${profile})`;
      byColor[color] = (byColor[color] ?? 0) + n;
    }
    console.table(byColor);
    console.log(apply ? "✔ Perfiles guardados." : "Vista previa: no se cambió nada. Agrega --aplicar para guardar.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(`✘ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
