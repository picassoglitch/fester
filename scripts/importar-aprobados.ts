/**
 * Carga la lista de aprobados que validó Fester ("Sí" en la hoja REGISTROS) en la base de DATABASE_URL.
 * Uso: npx tsx scripts/importar-aprobados.ts "<ruta al .xlsx>" [--aplicar]   (sin --aplicar solo muestra)
 */
import readXlsxFile from "read-excel-file/node";
import { PrismaClient } from "@prisma/client";
import { approvedFromSheets } from "../src/lib/approved";
import { applyApprovedList } from "../src/lib/approved-apply";

async function main() {
  const file = process.argv[2];
  const apply = process.argv.includes("--aplicar");
  if (!file) throw new Error('Falta la ruta: npx tsx scripts/importar-aprobados.ts "archivo.xlsx" [--aplicar]');

  const list = approvedFromSheets(await readXlsxFile(file));
  if (!list.ok) throw new Error(list.error);
  const host = new URL(process.env.DATABASE_URL ?? "postgresql://sin-base").hostname;
  console.log(`Hoja ${list.sheet}: ${list.rows.length} con «Sí», ${list.rejected} con «No». Base: ${host}`);
  if (list.unmatched.length) console.log(`Sin código ni correo (no se pueden ligar): ${list.unmatched.join(", ")}`);

  const db = new PrismaClient();
  try {
    const result = await applyApprovedList(db, list.rows, { apply });
    if (!result.ok) throw new Error(result.error);
    console.log(`Aprobados: ${result.approved} (${result.byEmail} por correo). No aprobados: ${result.notApproved}.`);
    if (result.notFound.length) {
      console.log(`${result.notFound.length} del Excel sin pase en el sistema: ${result.notFound.join(", ")}`);
    }
    console.log(apply ? "✔ Lista aplicada." : "Vista previa: no se cambió nada. Agrega --aplicar para guardar.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(`✘ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
