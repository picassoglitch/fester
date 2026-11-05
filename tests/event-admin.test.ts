import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hasLocalDb, testCode } from "./db";
import { approvedFromSheets } from "@/lib/approved";
import { buildXlsx } from "@/lib/xlsx";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireAdmin: vi.fn(async () => ({ id: "admin", name: "Admin", role: "ADMIN" })),
}));

const HEADER = ["# registro", "codigo", "ok", "nombre", "correo"];

/** Igual que el Excel de Fester: filas de resumen arriba y hojas RECHAZADOS con el mismo encabezado. */
function workbook(rows: (string | null)[][]) {
  return [
    { sheet: "Hoja1", data: [["Asisten", "Perfil"], ["Sí", "Aplicador"]] },
    { sheet: "RECHAZADOS 30-10", data: [HEADER, ["1", "AAAAAA", "No", "X", "x@x.mx"]] },
    { sheet: "REGISTROS ", data: [["No de registros", null, null, "2217"], [], HEADER, ...rows] },
  ];
}

describe("approvedFromSheets", () => {
  it("toma solo «Sí» de la hoja REGISTROS, sin importar acentos ni espacios", () => {
    const list = approvedFromSheets(
      workbook([
        ["1", "abc123", "Sí", "Ana", "ana@x.mx"],
        ["2", "DEF456", "si ", "Beto", null],
        ["3", "GHI789", "No", "Caro", "caro@x.mx"],
        ["4", null, "Sí", "Dani Alta Manual", "Dani@X.mx"],
        ["5", null, "Sí", "Eli Sin Datos", null],
      ]),
    );
    expect(list).toEqual({
      ok: true,
      sheet: "REGISTROS",
      approved: ["ABC123", "DEF456"],
      approvedEmails: ["dani@x.mx"],
      unmatched: ["Eli Sin Datos"],
      rejected: 1,
    });
  });

  it("explica qué falta cuando el archivo no es el esperado", () => {
    expect(approvedFromSheets([{ sheet: "Otra", data: [] }])).toMatchObject({ ok: false });
    expect(approvedFromSheets([{ sheet: "REGISTROS", data: [["a", "b"]] }])).toMatchObject({ ok: false });
    expect(approvedFromSheets(workbook([["1", "X1", "No", "n", null]]))).toMatchObject({ ok: false });
  });
});

describe.skipIf(!hasLocalDb)("importApproved y resetEvent (base local)", () => {
  const yes = testCode();
  const byMail = testCode();
  const nope = testCode();
  const mail = `${byMail.toLowerCase()}@pruebas.mx`;
  let stationId = "";

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.createMany({
      data: [
        { code: yes, name: "Import Sí" },
        { code: byMail, name: "Import Correo", email: mail.toUpperCase() },
        { code: nope, name: "Import No", approved: true },
      ],
    });
    stationId = (await prisma.station.create({ data: { name: `Prueba ${yes}` } })).id;
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code: { in: [yes, byMail, nope] } } });
    await prisma.station.deleteMany({ where: { id: stationId } });
    await prisma.$disconnect();
  });

  function upload(rows: (string | null)[][], name = "30-10 Registros.xlsx") {
    const buf = buildXlsx([
      { name: "REGISTROS", columns: HEADER.map((header) => ({ header })), rows: rows.map((r) => r.map((c) => c ?? "")) },
    ]);
    const data = new FormData();
    data.set("file", new File([new Uint8Array(buf)], name));
    return data;
  }

  it("aprueba por código y por correo, y quita a quien ya no viene con Sí", async () => {
    const { prisma } = await import("@/lib/db");
    const { importApproved } = await import("@/app/actions/event");
    const state = await importApproved(
      {},
      upload([
        ["1", yes, "Sí", "Import Sí", ""],
        ["2", "", "Sí", "Import Correo", mail],
        ["3", nope, "No", "Import No", ""],
        ["4", "NOEXISTE", "Sí", "Fantasma", ""],
      ]),
    );
    expect(state.error).toBeUndefined();
    expect(state.ok).toMatchObject({ approved: 2, byEmail: 1, notFound: ["NOEXISTE"] });
    const rows = await prisma.attendee.findMany({ where: { code: { in: [yes, byMail, nope] } } });
    const approved = Object.fromEntries(rows.map((r) => [r.code, r.approved]));
    expect(approved).toEqual({ [yes]: true, [byMail]: true, [nope]: false });
  });

  it("un archivo que no es Excel no cambia nada", async () => {
    const { importApproved } = await import("@/app/actions/event");
    const data = new FormData();
    data.set("file", new File(["hola"], "lista.ods"));
    expect((await importApproved({}, data)).error).toMatch(/xlsx/);
  });

  it("reiniciar exige la palabra y borra la actividad pero conserva registros y aprobados", async () => {
    const { prisma } = await import("@/lib/db");
    const { resetEvent } = await import("@/app/actions/event");
    const a = await prisma.attendee.update({
      where: { code: yes },
      data: { completedAt: new Date(), redeemedAt: new Date(), insideAt: new Date() },
    });
    await prisma.scan.create({ data: { attendeeId: a.id, stationId } });
    await prisma.access.create({ data: { attendeeId: a.id, kind: "ENTRY" } });
    await prisma.raffleWinner.create({ data: { attendeeId: a.id } });

    const wrong = new FormData();
    wrong.set("confirm", "si");
    expect((await resetEvent({}, wrong)).error).toBeDefined();
    expect(await prisma.scan.count({ where: { attendeeId: a.id } })).toBe(1);

    const right = new FormData();
    right.set("confirm", " reiniciar ");
    expect((await resetEvent({}, right)).ok).toBeDefined();
    const after = await prisma.attendee.findUniqueOrThrow({ where: { code: yes } });
    expect(after).toMatchObject({ approved: true, completedAt: null, redeemedAt: null, insideAt: null });
    expect(await prisma.scan.count({ where: { attendeeId: a.id } })).toBe(0);
    expect(await prisma.access.count({ where: { attendeeId: a.id } })).toBe(0);
    expect(await prisma.raffleWinner.count({ where: { attendeeId: a.id } })).toBe(0);
    expect(await prisma.station.count({ where: { id: stationId } })).toBe(1);
  });
});
