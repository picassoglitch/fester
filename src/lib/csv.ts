import type { CellValue } from "@/lib/xlsx";

/**
 * Excel y Sheets ejecutan como formula la celda que empieza con = + - @, tab o
 * CR. Se antepone ' (recomendacion de OWASP). Los telefonos +52… mostraran la
 * comilla al abrir el CSV.
 */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function toCsv(rows: CellValue[][]): string {
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = neutralizeFormula(String(cell ?? ""));
          return /[",;\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(","),
    )
    .join("\r\n");
  // BOM para que Excel respete los acentos.
  return `﻿${body}`;
}
