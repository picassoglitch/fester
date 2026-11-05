// Fester 2026-11-05 — el perfil sale de la columna «Perfil» de la hoja REGISTROS (mismo Excel que los aprobados).

import { normalizeCode } from "@/lib/codes";

type Cell = unknown;
export type ProfileSheetInput = { sheet: string; data: Cell[][] };
export type ProfileRow = { code: string | null; email: string | null; profile: string };
export type ProfileList =
  | { ok: true; sheet: string; rows: ProfileRow[]; blank: number }
  | { ok: false; error: string };

function plain(value: Cell): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export function profilesFromSheets(sheets: ProfileSheetInput[]): ProfileList {
  const sheet = sheets.find((s) => plain(s.sheet) === "registros");
  if (!sheet) return { ok: false, error: "El archivo no tiene una hoja llamada REGISTROS." };

  let header = -1;
  let code = -1;
  let profile = -1;
  let email = -1;
  for (let row = 0; row < Math.min(sheet.data.length, 30); row++) {
    const cells = sheet.data[row].map(plain);
    if (cells.includes("codigo") && cells.includes("perfil")) {
      header = row;
      code = cells.indexOf("codigo");
      profile = cells.indexOf("perfil");
      email = cells.indexOf("correo");
      break;
    }
  }
  if (header < 0) return { ok: false, error: "La hoja REGISTROS no tiene las columnas «codigo» y «Perfil»." };

  const rows: ProfileRow[] = [];
  let blank = 0;
  for (const row of sheet.data.slice(header + 1)) {
    const c = normalizeCode(String(row[code] ?? ""));
    const e = email >= 0 ? String(row[email] ?? "").trim().toLowerCase() : "";
    const p = String(row[profile] ?? "").trim();
    if (!c && !e) continue;
    if (!p) {
      blank++;
      continue;
    }
    rows.push({ code: c || null, email: e || null, profile: p });
  }
  if (rows.length === 0) return { ok: false, error: "La columna Perfil está vacía." };
  return { ok: true, sheet: sheet.sheet.trim(), rows, blank };
}
