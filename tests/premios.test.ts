import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hasLocalDb, testCode } from "./db";

const getSession = vi.fn();
vi.mock("@/lib/auth", () => ({ getSession }));

const ADMIN = { id: "a", name: "A", role: "ADMIN", sessionVersion: 0 };
const STAFF = { id: "s", name: "S", role: "STAFF", sessionVersion: 0 };

async function exportPremios(query: string) {
  const { GET } = await import("@/app/api/admin/export/[tipo]/route");
  return GET(new Request(`http://localhost/api/admin/export/premios?${query}`), {
    params: Promise.resolve({ tipo: "premios" }),
  });
}

describe.skipIf(!hasLocalDb)("seguimiento de premios (base local)", () => {
  // Marca unica para buscar solo lo que crea esta prueba.
  const marker = `Premiotest${Math.random().toString(36).slice(2, 8)}`;
  const codes = {
    // Recibieron premio y luego dejaron de figurar como completos.
    early: [testCode(), testCode(), testCode()],
    pending: testCode(),
    delivered: testCode(),
    inProgress: testCode(),
  };
  const all = [...codes.early, codes.pending, codes.delivered, codes.inProgress];
  let staffId = "";

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    const staff = await prisma.staff.create({ data: { name: `Mesa ${marker}`, pinHash: "x" } });
    staffId = staff.id;
    const contact = { email: `${marker}@ejemplo.com`, phone: "+525512345678", company: "Acme" };
    const now = new Date();
    await prisma.attendee.createMany({
      data: [
        ...codes.early.map((code) => ({
          code,
          name: `${marker} Temprano`,
          ...contact,
          redeemedAt: now,
          redeemedById: staffId,
        })),
        { code: codes.pending, name: `${marker} Pendiente`, ...contact, completedAt: now },
        {
          code: codes.delivered,
          name: `${marker} Entregado`,
          ...contact,
          completedAt: now,
          redeemedAt: now,
          redeemedById: staffId,
        },
        { code: codes.inProgress, name: `${marker} En curso`, ...contact },
      ],
    });
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { code: { in: all } } });
    await prisma.staff.delete({ where: { id: staffId } });
    await prisma.$disconnect();
  });

  beforeEach(() => getSession.mockReset());

  it("los contadores salen de su propia consulta y nunca son negativos", async () => {
    const { prisma } = await import("@/lib/db");
    const { getDashboardStats } = await import("@/lib/stats");
    const { getStaffStats } = await import("@/lib/staff-stats");
    const { getPrizeCounts } = await import("@/lib/prizes");

    const expected = {
      completed: await prisma.attendee.count({ where: { completedAt: { not: null } } }),
      delivered: await prisma.attendee.count({ where: { redeemedAt: { not: null } } }),
      pending: await prisma.attendee.count({
        where: { completedAt: { not: null }, redeemedAt: null },
      }),
    };
    expect(expected.pending).toBeGreaterThanOrEqual(1);

    const dashboard = await getDashboardStats();
    expect(dashboard.totals.pendingPrizes).toBe(expected.pending);
    expect(dashboard.totals.redeemed).toBe(expected.delivered);
    expect(dashboard.totals.completed).toBe(expected.completed);

    const staff = await getStaffStats(staffId);
    expect(staff.pendingPrizes).toBe(expected.pending);

    expect(await getPrizeCounts()).toEqual(expected);
    for (const n of [dashboard.totals.pendingPrizes, staff.pendingPrizes, expected.pending]) {
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });

  it("pendiente = completó y no ha recibido premio", async () => {
    const { prisma } = await import("@/lib/db");
    const { prizeWhere } = await import("@/lib/prizes");
    const rows = await prisma.attendee.findMany({
      where: prizeWhere("pendientes", marker),
      select: { code: true },
    });
    expect(rows.map((r) => r.code)).toEqual([codes.pending]);

    const delivered = await prisma.attendee.findMany({
      where: prizeWhere("entregados", marker),
      select: { code: true },
    });
    expect(delivered.map((r) => r.code).sort()).toEqual([...codes.early, codes.delivered].sort());

    const everyone = await prisma.attendee.findMany({
      where: prizeWhere("todos", marker),
      select: { code: true },
    });
    expect(everyone.map((r) => r.code)).not.toContain(codes.inProgress);
    expect(everyone).toHaveLength(5);

    // Busqueda por codigo, sin importar mayusculas.
    const byCode = await prisma.attendee.findMany({
      where: prizeWhere("pendientes", codes.pending.toLowerCase()),
      select: { code: true },
    });
    expect(byCode.map((r) => r.code)).toEqual([codes.pending]);
  });

  it("la lista de la mesa de premios solo trae nombre y código", async () => {
    const { getPendingPrizeDesk } = await import("@/lib/prizes");
    const result = await getPendingPrizeDesk(marker);
    expect(result.total).toBe(1);
    expect(result.rows).toEqual([{ name: `${marker} Pendiente`, code: codes.pending }]);
    for (const row of result.rows) expect(Object.keys(row).sort()).toEqual(["code", "name"]);
    expect(JSON.stringify(result)).not.toMatch(/@ejemplo\.com|5512345678|email|phone/);

    const limited = await getPendingPrizeDesk("", 1);
    expect(limited.rows.length).toBeLessThanOrEqual(1);
  });

  it("export de premios: solo admin", async () => {
    getSession.mockResolvedValue(null);
    expect((await exportPremios("tab=todos")).status).toBe(401);
    getSession.mockResolvedValue(STAFF);
    expect((await exportPremios("tab=todos")).status).toBe(401);
  });

  it("export de premios: respeta pestaña y búsqueda, columnas sin datos de contacto", async () => {
    getSession.mockResolvedValue(ADMIN);

    const pending = await exportPremios(`tab=pendientes&q=${marker}`);
    expect(pending.status).toBe(200);
    expect(pending.headers.get("cache-control")).toBe("no-store");
    expect(pending.headers.get("content-type")).toContain("text/csv");
    expect(pending.headers.get("content-disposition")).toContain("fester-premios-pendientes");
    const pendingLines = (await pending.text()).replace(/^﻿/, "").split("\r\n");
    expect(pendingLines[0]).toBe(
      "nombre,codigo,empresa,completo,premio_entregado,entregado_por,nota",
    );
    expect(pendingLines).toHaveLength(2);
    expect(pendingLines[1]).toContain(codes.pending);

    const delivered = await exportPremios(`tab=entregados&q=${marker}`);
    const deliveredCsv = await delivered.text();
    const deliveredLines = deliveredCsv.replace(/^﻿/, "").split("\r\n");
    expect(deliveredLines).toHaveLength(5);
    expect(deliveredCsv).not.toContain(codes.pending);
    expect(deliveredCsv).toContain(`Mesa ${marker}`);
    const early = deliveredLines.find((line) => line.includes(codes.early[0]));
    expect(early).toContain("entregado sin recorrido completo");
    expect(deliveredCsv).not.toMatch(/@ejemplo\.com|5512345678/);

    // Pestaña desconocida cae en pendientes.
    const fallback = await exportPremios(`tab=otra&q=${marker}`);
    expect((await fallback.text()).split("\r\n")).toHaveLength(2);
  });
});
