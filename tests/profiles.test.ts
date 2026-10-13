import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POSITIONS } from "@/lib/event";
import { countByProfile, PROFILES, profileOf, profileWhere } from "@/lib/profiles";
import { ensureStations, hasLocalDb, testCode } from "./db";

describe("perfil de un asistente", () => {
  it("usa el puesto del catalogo tal cual", () => {
    expect(profileOf("Arquitecto")).toBe("Arquitecto");
    expect(profileOf("Albañil")).toBe("Albañil");
    expect(profileOf("Estudiante")).toBe("Estudiante");
  });

  it("cuenta como estudiante a quien lo escribio en Otro", () => {
    expect(profileOf("Otro: Estudiante")).toBe("Estudiante");
    expect(profileOf("Otro: estudiante de arquitectura")).toBe("Estudiante");
    expect(profileOf("Otro: ALUMNO UNAM")).toBe("Estudiante");
  });

  it("junta el resto de Otro y lo que no es del catalogo", () => {
    expect(profileOf("Otro: Ingeniero civil")).toBe("Otro");
    expect(profileOf("Otro")).toBe("Otro");
    expect(profileOf("Gerente")).toBe("Otro");
  });

  it("separa a quien no tiene puesto", () => {
    expect(profileOf(null)).toBe("Sin dato");
    expect(profileOf("  ")).toBe("Sin dato");
  });

  it("Estudiante esta en el formulario, antes de Otro", () => {
    expect(POSITIONS.indexOf("Estudiante")).toBe(POSITIONS.indexOf("Otro") - 1);
  });

  it("suma por perfil en el orden del formulario y omite los vacios", () => {
    expect(
      countByProfile([
        { position: "Otro: estudiante", count: 2 },
        { position: "Arquitecto", count: 3 },
        { position: "Estudiante", count: 1 },
        { position: null, count: 1 },
      ]),
    ).toEqual([
      { profile: "Arquitecto", count: 3 },
      { profile: "Estudiante", count: 3 },
      { profile: "Sin dato", count: 1 },
    ]);
  });
});

describe.skipIf(!hasLocalDb)("perfiles en la base local", () => {
  const marker = `Perfiltest${Math.random().toString(36).slice(2, 8)}`;
  const positions = [
    "Arquitecto",
    "Arquitecto",
    "Albañil",
    "Estudiante",
    "Otro: Estudiante de ingeniería",
    "Otro: Ingeniero",
    "Gerente",
    null,
  ];
  const codes = positions.map(() => testCode());

  beforeAll(async () => {
    await ensureStations();
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.createMany({
      data: positions.map((position, index) => ({
        code: codes[index],
        name: `${marker} ${index}`,
        position,
      })),
    });
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code: { in: codes } } });
  });

  it("el filtro de cada perfil trae exactamente a quienes profileOf pone ahi", async () => {
    const { prisma } = await import("@/lib/db");
    for (const profile of PROFILES) {
      const found = await prisma.attendee.findMany({
        where: { AND: [{ code: { in: codes } }, profileWhere(profile)] },
        select: { position: true },
      });
      const expected = positions.filter((p) => profileOf(p) === profile).length;
      expect(found.length, profile).toBe(expected);
      for (const row of found) expect(profileOf(row.position), profile).toBe(profile);
    }
  });

  it("el panel reparte las visitas de cada estacion por perfil", async () => {
    const { prisma } = await import("@/lib/db");
    const { getDashboardStats } = await import("@/lib/stats");
    const station = await prisma.station.findFirstOrThrow({ where: { active: true } });
    const attendees = await prisma.attendee.findMany({ where: { code: { in: codes } } });
    const before = (await getDashboardStats()).stations.find((s) => s.id === station.id)!;
    await prisma.scan.createMany({
      data: attendees.map((a) => ({ attendeeId: a.id, stationId: station.id })),
    });

    const after = (await getDashboardStats()).stations.find((s) => s.id === station.id)!;
    const gained = (rows: { profile: string; count: number }[], profile: string) =>
      (rows.find((r) => r.profile === profile)?.count ?? 0) -
      (before.profiles.find((r) => r.profile === profile)?.count ?? 0);

    expect(gained(after.profiles, "Arquitecto")).toBe(2);
    expect(gained(after.profiles, "Estudiante")).toBe(2);
    expect(gained(after.profiles, "Otro")).toBe(2);
    expect(gained(after.profiles, "Sin dato")).toBe(1);
    // Recien escaneados: tambien entran en la ventana de la ultima hora.
    expect(after.profilesLastHour.find((r) => r.profile === "Albañil")?.count ?? 0).toBeGreaterThan(0);
  });

  it("la ultima hora no cuenta escaneos de hace horas, sin importar la zona de la base", async () => {
    const { prisma } = await import("@/lib/db");
    const { getDashboardStats } = await import("@/lib/stats");
    const [, other] = await prisma.station.findMany({ where: { active: true }, orderBy: { order: "asc" } });
    const architect = await prisma.attendee.findFirstOrThrow({
      where: { code: { in: codes }, position: "Arquitecto" },
    });
    const count = async () =>
      (await getDashboardStats()).stations
        .find((s) => s.id === other.id)!
        .profilesLastHour.find((r) => r.profile === "Arquitecto")?.count ?? 0;

    // Sesion con una zona que no es UTC (la de prod puede ser cualquiera).
    await prisma.$executeRawUnsafe(`ALTER DATABASE "${new URL(process.env.DATABASE_URL!).pathname.slice(1)}" SET timezone TO 'America/Mexico_City'`);
    const before = await count();
    await prisma.scan.create({
      data: { attendeeId: architect.id, stationId: other.id, createdAt: new Date(Date.now() - 3 * 3600_000) },
    });
    expect(await count()).toBe(before);
  });
});
