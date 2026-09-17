import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { buildXlsx, type CellValue, type Sheet } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

function toCsv(rows: CellValue[][]): string {
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return /[",;\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(","),
    )
    .join("\r\n");
  // BOM para que Excel respete los acentos.
  return `﻿${body}`;
}

function fileStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Todo lo capturado de cada persona, mas su avance estacion por estacion. */
async function attendeesSheet(): Promise<Sheet> {
  const [stations, attendees] = await Promise.all([
    prisma.station.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    prisma.attendee.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        redeemedBy: { select: { name: true } },
        scans: { select: { stationId: true, createdAt: true } },
      },
    }),
  ]);

  const columns = [
    { header: "codigo", width: 12 },
    { header: "nombre", width: 28 },
    { header: "correo", width: 30 },
    { header: "correo_verificado", width: 18 },
    { header: "telefono", width: 16 },
    { header: "empresa", width: 26 },
    { header: "puesto", width: 22 },
    { header: "giro", width: 24 },
    { header: "estado", width: 18 },
    { header: "ciudad", width: 16 },
    { header: "edad", width: 8 },
    { header: "como_se_entero", width: 24 },
    { header: "registro", width: 18 },
    { header: "aviso_privacidad", width: 18 },
    { header: "estrellas", width: 10 },
    { header: "total_estaciones", width: 16 },
    { header: "completo", width: 18 },
    { header: "premio_entregado", width: 18 },
    { header: "entregado_por", width: 20 },
    { header: "ultima_actividad", width: 18 },
    ...stations.map((station) => ({ header: station.name, width: 18 })),
  ];

  const rows: CellValue[][] = attendees.map((attendee) => {
    const byStation = new Map(attendee.scans.map((scan) => [scan.stationId, scan.createdAt]));
    const stars = stations.filter((station) => byStation.has(station.id)).length;
    const lastScan = attendee.scans.reduce<Date | null>(
      (latest, scan) => (!latest || scan.createdAt > latest ? scan.createdAt : latest),
      null,
    );

    return [
      attendee.code,
      attendee.name,
      attendee.email ?? "",
      attendee.emailVerifiedAt ? formatDateTime(attendee.emailVerifiedAt) : "",
      attendee.phone ?? "",
      attendee.company ?? "",
      attendee.position ?? "",
      attendee.industry ?? "",
      attendee.state ?? "",
      attendee.city ?? "",
      attendee.age ?? "",
      attendee.referral ?? "",
      formatDateTime(attendee.createdAt),
      attendee.privacyAt ? formatDateTime(attendee.privacyAt) : "",
      stars,
      stations.length,
      attendee.completedAt ? formatDateTime(attendee.completedAt) : "",
      attendee.redeemedAt ? formatDateTime(attendee.redeemedAt) : "",
      attendee.redeemedBy?.name ?? "",
      lastScan ? formatDateTime(lastScan) : "",
      ...stations.map((station) => {
        const at = byStation.get(station.id);
        return at ? formatDateTime(at) : "";
      }),
    ];
  });

  return { name: "Asistentes", columns, rows };
}

async function scansSheet(): Promise<Sheet> {
  const scans = await prisma.scan.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      attendee: { select: { code: true, name: true, email: true, company: true } },
      station: { select: { name: true } },
      staff: { select: { name: true } },
    },
  });

  return {
    name: "Escaneos",
    columns: [
      { header: "fecha", width: 18 },
      { header: "codigo", width: 12 },
      { header: "asistente", width: 28 },
      { header: "correo", width: 30 },
      { header: "empresa", width: 26 },
      { header: "estacion", width: 24 },
      { header: "staff", width: 20 },
    ],
    rows: scans.map((scan) => [
      formatDateTime(scan.createdAt),
      scan.attendee.code,
      scan.attendee.name,
      scan.attendee.email ?? "",
      scan.attendee.company ?? "",
      scan.station.name,
      scan.staff?.name ?? "",
    ]),
  };
}

function sheetToRows(sheet: Sheet): CellValue[][] {
  return [sheet.columns.map((column) => column.header), ...sheet.rows];
}

export async function GET(_request: Request, context: { params: Promise<{ tipo: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { tipo } = await context.params;

  // Libro de Excel con las dos hojas: es lo que se pasa a marketing y ventas.
  if (tipo === "excel") {
    const [attendees, scans] = await Promise.all([attendeesSheet(), scansSheet()]);
    const workbook = buildXlsx([attendees, scans]);

    return new NextResponse(new Uint8Array(workbook), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8",
        "Content-Disposition": `attachment; filename="fester-asistentes-${fileStamp()}.xlsx"`,
      },
    });
  }

  if (tipo === "escaneos") {
    return new NextResponse(toCsv(sheetToRows(await scansSheet())), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fester-escaneos.csv"',
      },
    });
  }

  return new NextResponse(toCsv(sheetToRows(await attendeesSheet())), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fester-asistentes.csv"',
    },
  });
}
