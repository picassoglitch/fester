import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hasLocalDb, testCode } from "./db";

describe.skipIf(!hasLocalDb)("Salida en los paneles cuenta las salidas (base local)", () => {
  const code = testCode();
  let createdStation: string | null = null;
  let salidaId = "";
  let before = { dash: 0, staff: 0 };

  async function counts() {
    const { getDashboardStats } = await import("@/lib/stats");
    const { getStaffStats } = await import("@/lib/staff-stats");
    const dash = (await getDashboardStats()).stations.find((s) => s.id === salidaId)!.visits;
    const staff = (await getStaffStats("nadie")).stations.find((s) => s.id === salidaId)!.scans;
    return { dash, staff };
  }

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    let salida = await prisma.station.findFirst({ where: { name: "Salida" } });
    if (!salida) {
      salida = await prisma.station.create({ data: { name: "Salida", order: 99 } });
      createdStation = salida.id;
    } else if (!salida.active) {
      await prisma.station.update({ where: { id: salida.id }, data: { active: true } });
    }
    salidaId = salida.id;
    before = await counts();
    const a = await prisma.attendee.create({ data: { code, name: "Salida Prueba" } });
    await prisma.access.createMany({
      data: [
        { attendeeId: a.id, kind: "ENTRY" },
        { attendeeId: a.id, kind: "EXIT" },
      ],
    });
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code } });
    if (createdStation) await prisma.station.delete({ where: { id: createdStation } });
    await prisma.$disconnect();
  });

  it("una salida registrada suma 1 en el panel admin y en el de staff", async () => {
    const after = await counts();
    expect(after.dash - before.dash).toBe(1);
    expect(after.staff - before.staff).toBe(1);
  });
});
