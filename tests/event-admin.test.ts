import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hasLocalDb, testCode } from "./db";
import { approvedFromSheets } from "@/lib/approved";
import { buildXlsx } from "@/lib/xlsx";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const requireAdmin = vi.fn(async () => ({ id: "admin", name: "Admin", role: "ADMIN" }));
vi.mock("@/lib/auth", () => ({ requireAdmin }));

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
        ["2", "def-456 ", "si ", "Beto", null],
        ["3", "GHI789", "No", "Caro", "caro@x.mx"],
        ["4", null, "Sí", "Dani Alta Manual", "Dani@X.mx"],
        ["5", null, "Sí", "Eli Sin Datos", null],
      ]),
    );
    expect(list).toEqual({
      ok: true,
      sheet: "REGISTROS",
      rows: [
        { code: "ABC123", email: "ana@x.mx" },
        { code: "DEF456", email: null },
        { code: null, email: "dani@x.mx" },
      ],
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

describe.skipIf(!hasLocalDb)("lista de aprobados y resetEvent (base local)", () => {
  const yes = testCode();
  const byMail = testCode();
  const nope = testCode();
  const mail = `${byMail.toLowerCase()}@pruebas.mx`;
  let stationId = "";
  // La importacion reemplaza la lista de toda la base local: se restaura al final.
  let wasApproved: string[] = [];

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    wasApproved = (await prisma.attendee.findMany({ where: { approved: true }, select: { id: true } })).map((a) => a.id);
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
    await prisma.attendee.updateMany({ where: { id: { in: wasApproved } }, data: { approved: true } });
    await prisma.$disconnect();
  });

  /** Mismo camino que el script: .xlsx real -> lector -> parser -> base. */
  async function load(rows: (string | null)[][], apply = true) {
    const readXlsxFile = (await import("read-excel-file/node")).default;
    const { prisma } = await import("@/lib/db");
    const { applyApprovedList } = await import("@/lib/approved-apply");
    const buf = buildXlsx([
      { name: "REGISTROS", columns: HEADER.map((header) => ({ header })), rows: rows.map((r) => r.map((c) => c ?? "")) },
    ]);
    const list = approvedFromSheets(await readXlsxFile(buf));
    if (!list.ok) throw new Error(list.error);
    return applyApprovedList(prisma, list.rows, { apply });
  }

  async function approvedMap() {
    const { prisma } = await import("@/lib/db");
    const rows = await prisma.attendee.findMany({ where: { code: { in: [yes, byMail, nope] } } });
    return Object.fromEntries(rows.map((r) => [r.code, r.approved]));
  }

  it("vista previa no escribe; aplicar aprueba por código y correo y quita a quien ya no viene con Sí", async () => {
    const rows = [
      ["1", yes, "Sí", "Import Sí", ""],
      ["2", "", "Sí", "Import Correo", mail],
      ["3", nope, "No", "Import No", ""],
      ["4", "NOEXISTE", "Sí", "Fantasma", ""],
    ];
    expect(await load(rows, false)).toMatchObject({ ok: true, approved: 2, applied: false });
    expect(await approvedMap()).toEqual({ [yes]: false, [byMail]: false, [nope]: true });

    expect(await load(rows)).toMatchObject({ ok: true, approved: 2, byEmail: 1, notFound: ["NOEXISTE"], applied: true });
    expect(await approvedMap()).toEqual({ [yes]: true, [byMail]: true, [nope]: false });
  });

  it("un Excel que casi no coincide con la base no toca la lista", async () => {
    const result = await load([
      ["1", "NADA01", "Sí", "x", ""],
      ["2", "NADA02", "Sí", "y", ""],
      ["3", nope, "Sí", "z", ""],
    ]);
    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.error).toMatch(/1 de 3/);
    expect(await approvedMap()).toEqual({ [yes]: true, [byMail]: true, [nope]: false });
  });

  it("un código equivocado en el Excel se rescata por correo", async () => {
    expect(
      await load([
        ["1", yes, "Sí", "Import Sí", ""],
        ["2", "MAL999", "Sí", "Import Correo", mail],
      ]),
    ).toMatchObject({ ok: true, approved: 2, byEmail: 1, notFound: [] });
  });

  it("sin rol de administrador no se reinicia", async () => {
    const { resetEvent } = await import("@/app/actions/event");
    requireAdmin.mockRejectedValueOnce(new Error("Se requiere rol de administrador"));
    const data = new FormData();
    data.set("confirm", "REINICIAR");
    await expect(resetEvent({}, data)).rejects.toThrow();
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
