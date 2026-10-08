import { beforeEach, describe, expect, it, vi } from "vitest";
import { toCsv } from "@/lib/csv";

const getSession = vi.fn();
vi.mock("@/lib/auth", () => ({ getSession }));
vi.mock("@/lib/db", () => ({
  prisma: {
    station: { findMany: vi.fn(async () => []) },
    attendee: { findMany: vi.fn(async () => []) },
    scan: { findMany: vi.fn(async () => []) },
  },
}));

async function call(tipo: string) {
  const { GET } = await import("@/app/api/admin/export/[tipo]/route");
  return GET(new Request(`http://localhost/api/admin/export/${tipo}`), {
    params: Promise.resolve({ tipo }),
  });
}

beforeEach(() => getSession.mockReset());

describe("/api/admin/export/[tipo]", () => {
  it("anónimo -> 401 aunque el tipo no exista", async () => {
    getSession.mockResolvedValue(null);
    expect((await call("foo")).status).toBe(401);
    expect((await call("asistentes")).status).toBe(401);
  });

  it("staff (no admin) -> 401", async () => {
    getSession.mockResolvedValue({ id: "s", name: "S", role: "STAFF", sessionVersion: 0 });
    expect((await call("asistentes")).status).toBe(401);
    expect((await call("premios")).status).toBe(401);
  });

  it("admin con tipo desconocido -> 404", async () => {
    getSession.mockResolvedValue({ id: "a", name: "A", role: "ADMIN", sessionVersion: 0 });
    for (const tipo of ["foo", "toString", "constructor", "__proto__"]) {
      const res = await call(tipo);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "not_found" });
    }
  });

  it("admin con tipos válidos -> 200 y no-store", async () => {
    getSession.mockResolvedValue({ id: "a", name: "A", role: "ADMIN", sessionVersion: 0 });
    for (const tipo of ["excel", "asistentes", "escaneos", "premios"]) {
      const res = await call(tipo);
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
  });
});

describe("toCsv", () => {
  it("neutraliza fórmulas", () => {
    const csv = toCsv([["=1+1", "+5255", "-2", "@SUM(A1)", "\tx", "normal"]]);
    expect(csv.slice(1)).toBe("'=1+1,'+5255,'-2,'@SUM(A1),'\tx,normal");
  });
  it("sigue escapando comillas y comas", () => {
    expect(toCsv([['a "b"', "c,d"]]).slice(1)).toBe('"a ""b""","c,d"');
  });
});
