import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

function toCsv(rows: (string | number)[][]): string {
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

export async function GET(_request: Request, context: { params: Promise<{ tipo: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { tipo } = await context.params;

  if (tipo === "escaneos") {
    const scans = await prisma.scan.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        attendee: { select: { code: true, name: true } },
        station: { select: { name: true } },
        staff: { select: { name: true } },
      },
    });

    const rows: (string | number)[][] = [
      ["fecha", "codigo", "asistente", "estacion", "staff"],
      ...scans.map((scan) => [
        formatDateTime(scan.createdAt),
        scan.attendee.code,
        scan.attendee.name,
        scan.station.name,
        scan.staff?.name ?? "",
      ]),
    ];

    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="fester-escaneos.csv"',
      },
    });
  }

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

  const rows: (string | number)[][] = [
    [
      "codigo",
      "nombre",
      "correo",
      "telefono",
      "empresa",
      "puesto",
      "giro",
      "estado",
      "ciudad",
      "como_se_entero",
      "edad",
      "registro",
      "estrellas",
      "total_estaciones",
      "completo",
      "premio_entregado",
      "entregado_por",
      ...stations.map((s) => s.name),
    ],
    ...attendees.map((attendee) => {
      const byStation = new Map(attendee.scans.map((s) => [s.stationId, s.createdAt]));
      const stars = stations.filter((s) => byStation.has(s.id)).length;
      return [
        attendee.code,
        attendee.name,
        attendee.email ?? "",
        attendee.phone ?? "",
        attendee.company ?? "",
        attendee.position ?? "",
        attendee.industry ?? "",
        attendee.state ?? "",
        attendee.city ?? "",
        attendee.referral ?? "",
        attendee.age ?? "",
        formatDateTime(attendee.createdAt),
        stars,
        stations.length,
        attendee.completedAt ? formatDateTime(attendee.completedAt) : "",
        attendee.redeemedAt ? formatDateTime(attendee.redeemedAt) : "",
        attendee.redeemedBy?.name ?? "",
        ...stations.map((s) => {
          const at = byStation.get(s.id);
          return at ? formatDateTime(at) : "";
        }),
      ];
    }),
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fester-asistentes.csv"',
    },
  });
}
