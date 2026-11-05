import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hasLocalDb, testCode } from "./db";
import { braceletFor, braceletOf } from "@/lib/bracelet";
import { profilesFromSheets } from "@/lib/fester-profiles";

describe("braceletFor (tabla de Fester, lámina 11B)", () => {
  it.each([
    ["Aplicador", "ROJO", "Aplicador"],
    ["Distribuidor-ventas", "ROJO", "Aplicador"],
    ["DIY", "ROJO", "Aplicador"],
    ["Inspector de obras", "ROJO", "Aplicador"],
    ["Inspector de Obras", "ROJO", "Aplicador"],
    ["Ventas", "ROJO", "Aplicador"],
    ["Estudiante", "BLANCO", "Estudiante"],
    ["Profesionista", "AZUL", "Profesionista"],
    ["Constructora", "AZUL", "Profesionista"],
    ["Asociación CMIC", "AZUL", "Profesionista"],
    ["Otro: Administración de empresas y contabilidad", "AZUL", "Profesionista"],
    ["Bienes raíces", "AZUL", "Profesionista"],
    ["Distribuidor automotriz", "AZUL", "Profesionista"],
    ["inmobiliario", "AZUL", "Profesionista"],
    ["  asociacion cmic ", "AZUL", "Profesionista"],
  ])("%s → %s", (profile, color, category) => {
    expect(braceletFor(profile)).toEqual({ color, category });
  });

  it("perfiles fuera de la tabla o vacíos piden revisar", () => {
    for (const p of ["No específica", "N/A", "REGISTRO REPETIDO", "Inmobiliaria", "", null, undefined]) {
      expect(braceletFor(p)).toBeNull();
    }
  });
});

describe("braceletOf: sin perfil de Fester usa el puesto", () => {
  it.each([
    ["Arquitecto", "AZUL"],
    ["Estudiante", "BLANCO"],
    ["Otro: estudiante de arquitectura", "BLANCO"],
    ["Albañil", "ROJO"],
    ["Carpintero", "ROJO"],
    ["Contratista", "ROJO"],
    ["DIY", "ROJO"],
    ["Inspector de obras", "ROJO"],
    ["Maestro de obra", "ROJO"],
    ["Proveedor de materiales de construcción", "ROJO"],
    ["Técnico de la construcción", "ROJO"],
    ["Técnico de impermeabilización", "ROJO"],
  ])("%s → %s", (position, color) => {
    expect(braceletOf(null, position)).toMatchObject({ color, source: "puesto" });
    expect(braceletOf("No específica", position)).toMatchObject({ color, source: "puesto" });
  });

  it("el perfil de Fester gana sobre el puesto", () => {
    expect(braceletOf("Aplicador", "Arquitecto")).toEqual({ color: "ROJO", category: "Aplicador", source: "fester" });
  });

  it("«Otro» o sin puesto: revisar", () => {
    for (const position of ["Otro: Ventas", "", null]) expect(braceletOf(null, position)).toBeNull();
  });
});

describe("profilesFromSheets", () => {
  const header = ["# registro", "codigo", "ok", "nombre", "correo", "puesto", "Perfil"];
  it("lee la hoja «REGISTROS » con encabezado abajo, por código o correo", () => {
    const list = profilesFromSheets([
      { sheet: "Hoja1", data: [["x", "Perfil"]] },
      {
        sheet: "REGISTROS ",
        data: [
          ["titulo"],
          header,
          [1, "ab-12cd", "Sí", "Ana", "ANA@x.com", "Albañil", "Aplicador"],
          [2, null, "No", "Beto", "beto@x.com", "Arquitecto", "Profesionista"],
          [3, "ZZ99ZZ", "Sí", "Cata", null, "x", null],
          [4, null, null, null, null, null, "Estudiante"],
        ],
      },
    ]);
    expect(list).toEqual({
      ok: true,
      sheet: "REGISTROS",
      blank: 1,
      rows: [
        { code: "AB12CD", email: "ana@x.com", profile: "Aplicador" },
        { code: null, email: "beto@x.com", profile: "Profesionista" },
      ],
    });
  });

  it("archivo equivocado da error claro", () => {
    expect(profilesFromSheets([{ sheet: "Otra", data: [] }])).toMatchObject({ ok: false });
    expect(profilesFromSheets([{ sheet: "REGISTROS", data: [["codigo", "ok"]] }])).toMatchObject({ ok: false });
  });
});

describe.skipIf(!hasLocalDb)("perfiles en la base y en el escaneo", () => {
  const a = testCode();
  const b = testCode();
  const email = `${b.toLowerCase()}@prueba.mx`;

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.createMany({
      data: [
        { code: a, name: "Perfil Uno", company: "Obras Peña", position: "Albañil", state: "Puebla", email: "uno@p.mx" },
        { code: b, name: "Perfil Dos", email },
      ],
    });
  });
  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code: { in: [a, b] } } });
    await prisma.$disconnect();
  });

  it("vista previa no escribe; --aplicar guarda por código y por correo; el escaneo trae brazalete y registro", async () => {
    const { prisma } = await import("@/lib/db");
    const { applyFesterProfiles } = await import("@/lib/fester-profiles-apply");
    const { getStaffAttendeeProgress } = await import("@/lib/attendee");
    const rows = [
      { code: a, email: null, profile: "Distribuidor-ventas" },
      { code: "NOEXISTE", email, profile: "Constructora" },
    ];

    expect(await applyFesterProfiles(prisma, rows, { apply: false })).toMatchObject({ ok: true, updated: 2, byEmail: 1 });
    expect((await prisma.attendee.findUniqueOrThrow({ where: { code: a } })).festerProfile).toBeNull();

    await applyFesterProfiles(prisma, rows, { apply: true });
    const one = await getStaffAttendeeProgress(a);
    expect(one).toMatchObject({
      festerProfile: "Distribuidor-ventas",
      bracelet: { color: "ROJO", category: "Aplicador", source: "fester" },
      company: "Obras Peña",
      position: "Albañil",
      state: "Puebla",
    });
    expect(JSON.stringify(one)).not.toContain("uno@p.mx");
    expect(await getStaffAttendeeProgress(b)).toMatchObject({ bracelet: { color: "AZUL" } });
  });

  it("perfil repetido: se queda el que está en la tabla; correo compartido no se adivina", async () => {
    const { prisma } = await import("@/lib/db");
    const { applyFesterProfiles } = await import("@/lib/fester-profiles-apply");
    const shared = `${a.toLowerCase()}-dup@prueba.mx`;
    const c = testCode();
    const d = testCode();
    await prisma.attendee.createMany({ data: [{ code: c, name: "Dup C", email: shared }, { code: d, name: "Dup D", email: shared }] });
    try {
      const result = await applyFesterProfiles(
        prisma,
        [
          { code: a, email: null, profile: "Aplicador" },
          { code: a, email: null, profile: "REGISTRO REPETIDO" },
          { code: null, email: shared, profile: "Profesionista" },
        ],
        { apply: true },
      );
      expect(result).toMatchObject({ ok: true, updated: 1, conflicts: [a], ambiguous: [shared] });
      expect((await prisma.attendee.findUniqueOrThrow({ where: { code: a } })).festerProfile).toBe("Aplicador");
      expect((await prisma.attendee.findUniqueOrThrow({ where: { code: c } })).festerProfile).toBeNull();
    } finally {
      await prisma.attendee.deleteMany({ where: { code: { in: [c, d] } } });
    }
  });

  it("si casi nada coincide no toca la base", async () => {
    const { prisma } = await import("@/lib/db");
    const { applyFesterProfiles } = await import("@/lib/fester-profiles-apply");
    const result = await applyFesterProfiles(
      prisma,
      [
        { code: "NADA01", email: null, profile: "Aplicador" },
        { code: "NADA02", email: null, profile: "Aplicador" },
        { code: a, email: null, profile: "Estudiante" },
      ],
      { apply: true },
    );
    expect(result).toMatchObject({ ok: false });
    expect((await prisma.attendee.findUniqueOrThrow({ where: { code: a } })).festerProfile).toBe("Aplicador");
  });
});
