/**
 * Lista de aprobados que manda Fester en Excel ("30-10 Registros.xlsx").
 * Aprobado = "Sí" en la columna "ok" (columna C) de la hoja REGISTROS.
 * Sin Prisma ni Node: se prueba con datos sueltos.
 */

type Cell = unknown;
export type SheetInput = { sheet: string; data: Cell[][] };

export type ApprovedList =
  | {
      ok: true;
      sheet: string;
      approved: string[];
      /** Filas con "Sí" pero sin código (altas a mano): se aprueban por correo si se registraron. */
      approvedEmails: string[];
      /** "Sí" sin código ni correo: no hay forma de ligarlos a un pase. */
      unmatched: string[];
      rejected: number;
    }
  | { ok: false; error: string };

function plain(value: Cell): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

type Header = { row: number; code: number; ok: number; email: number; name: number };

function findHeader(data: Cell[][]): Header | null {
  for (let row = 0; row < Math.min(data.length, 30); row++) {
    const cells = data[row].map(plain);
    const code = cells.indexOf("codigo");
    const ok = cells.indexOf("ok");
    if (code >= 0 && ok >= 0) {
      return { row, code, ok, email: cells.indexOf("correo"), name: cells.indexOf("nombre") };
    }
  }
  return null;
}

export function approvedFromSheets(sheets: SheetInput[]): ApprovedList {
  // La hoja se llama "REGISTROS " (con espacio); las de RECHAZADOS traen el mismo encabezado.
  const sheet = sheets.find((s) => plain(s.sheet) === "registros");
  if (!sheet) return { ok: false, error: "El archivo no tiene una hoja llamada REGISTROS." };

  const header = findHeader(sheet.data);
  if (!header) return { ok: false, error: "La hoja REGISTROS no tiene las columnas «codigo» y «ok»." };

  const approved = new Set<string>();
  const approvedEmails = new Set<string>();
  const unmatched: string[] = [];
  let rejected = 0;
  for (const row of sheet.data.slice(header.row + 1)) {
    const code = String(row[header.code] ?? "").trim().toUpperCase();
    const email = header.email >= 0 ? String(row[header.email] ?? "").trim().toLowerCase() : "";
    if (plain(row[header.ok]) !== "si") {
      if (code || email) rejected++;
      continue;
    }
    if (code) approved.add(code);
    else if (email) approvedEmails.add(email);
    else if (header.name >= 0 && row[header.name]) unmatched.push(String(row[header.name]).trim());
  }
  if (approved.size + approvedEmails.size === 0) {
    return { ok: false, error: "No encontramos ningún «Sí» en la columna ok." };
  }
  return {
    ok: true,
    sheet: sheet.sheet.trim(),
    approved: [...approved],
    approvedEmails: [...approvedEmails],
    unmatched,
    rejected,
  };
}
