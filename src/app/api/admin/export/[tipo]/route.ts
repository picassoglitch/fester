import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { toCsv } from "@/lib/csv";
import { buildXlsx, type CellValue, type Sheet } from "@/lib/xlsx";
import { PRIZE_ROW_SELECT, parsePrizeTab, prizeOrder, prizeWhere } from "@/lib/prizes";

export const dynamic = "force-dynamic";

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

/** Seguimiento de premios: respeta la pestaña (?tab=) y la busqueda (?q=) de /admin/premios. */
async function prizesSheet(url: URL): Promise<Sheet> {
  const tab = parsePrizeTab(url.searchParams.get("tab"));
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const attendees = await prisma.attendee.findMany({
    where: prizeWhere(tab, q),
    orderBy: prizeOrder(tab),
    select: PRIZE_ROW_SELECT,
  });

  return {
    name: "Premios",
    columns: [
      { header: "nombre", width: 28 },
      { header: "codigo", width: 12 },
      { header: "empresa", width: 26 },
      { header: "completo", width: 18 },
      { header: "premio_entregado", width: 18 },
      { header: "entregado_por", width: 20 },
      { header: "nota", width: 40 },
    ],
    rows: attendees.map((attendee) => [
      attendee.name,
      attendee.code,
      attendee.company ?? "",
      attendee.completedAt ? formatDateTime(attendee.completedAt) : "",
      attendee.redeemedAt ? formatDateTime(attendee.redeemedAt) : "",
      attendee.redeemedBy?.name ?? "",
      attendee.redeemedAt && !attendee.completedAt
        ? "entregado antes de un cambio de estaciones"
        : "",
    ]),
  };
}

function sheetToRows(sheet: Sheet): CellValue[][] {
  return [sheet.columns.map((column) => column.header), ...sheet.rows];
}

export async function GET(request: Request, context: { params: Promise<{ tipo: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const { tipo } = await context.params;
  const exporter = EXPORTS[tipo as keyof typeof EXPORTS];
  // Lista cerrada: antes cualquier otro valor caia en el CSV completo.
  if (!Object.hasOwn(EXPORTS, tipo) || !exporter) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return exporter(request);
}

const NO_STORE = { "Cache-Control": "no-store" };

const EXPORTS = {
  // Libro de Excel con las dos hojas: es lo que se pasa a marketing y ventas.
  async excel() {
    const [attendees, scans] = await Promise.all([attendeesSheet(), scansSheet()]);
    const workbook = buildXlsx([attendees, scans]);

    return new NextResponse(new Uint8Array(workbook), {
      headers: {
        ...NO_STORE,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8",
        "Content-Disposition": `attachment; filename="fester-asistentes-${fileStamp()}.xlsx"`,
      },
    });
  },

  async asistentes() {
    return new NextResponse(toCsv(sheetToRows(await attendeesSheet())), {
      headers: {
        ...NO_STORE,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fester-asistentes.csv"',
      },
    });
  },

  async escaneos() {
    return new NextResponse(toCsv(sheetToRows(await scansSheet())), {
      headers: {
        ...NO_STORE,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fester-escaneos.csv"',
      },
    });
  },

  async premios(request: Request) {
    const url = new URL(request.url);
    const sheet = await prizesSheet(url);
    const tab = parsePrizeTab(url.searchParams.get("tab"));
    return new NextResponse(toCsv(sheetToRows(sheet)), {
      headers: {
        ...NO_STORE,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fester-premios-${tab}-${fileStamp()}.csv"`,
      },
    });
  },
} as const;
