// Aldo 2026-11-05 — «Reenviar pase» en el admin: sesion real contra la base local y Resend simulado con fetch.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hasLocalDb } from "./db";

let cookie: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "fester_session" && cookie ? { value: cookie } : undefined) }),
  headers: async () => new Headers(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const CODE_PREFIX = `RP${RUN.slice(-4).toUpperCase()}`;
let seq = 0;

function form(code: string): FormData {
  const data = new FormData();
  data.set("code", code);
  return data;
}

const fetchMock = vi.fn();

describe.skipIf(!hasLocalDb)("resendPassAsAdmin (base local)", () => {
  let adminToken = "";
  let staffToken = "";

  async function newAttendee(email: string | null = `reenvio-${++seq}-${RUN}@example.com`) {
    const { prisma } = await import("@/lib/db");
    return prisma.attendee.create({
      data: { code: `${CODE_PREFIX}${++seq}`, name: "Rosa Reenvío", email, phone: "5512345678" },
    });
  }

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    const { createSessionToken } = await import("@/lib/auth");
    const admin = await prisma.staff.create({ data: { name: `Admin ${RUN}`, pinHash: "x", role: "ADMIN" } });
    const staff = await prisma.staff.create({ data: { name: `Staff ${RUN}`, pinHash: "x", role: "STAFF" } });
    adminToken = await createSessionToken({ id: admin.id, name: admin.name, role: "ADMIN", sessionVersion: 0 });
    staffToken = await createSessionToken({ id: staff.id, name: staff.name, role: "STAFF", sessionVersion: 0 });
  });

  beforeEach(() => {
    cookie = adminToken;
    process.env.RESEND_API_KEY = "re_prueba_local";
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
    const { prisma } = await import("@/lib/db");
    const attendees = await prisma.attendee.findMany({ where: { code: { startsWith: CODE_PREFIX } }, select: { id: true } });
    await prisma.authThrottle.deleteMany({ where: { key: { in: attendees.map((a) => `admin:reenvio:${a.id}`) } } });
    await prisma.attendee.deleteMany({ where: { code: { startsWith: CODE_PREFIX } } });
    await prisma.staff.deleteMany({ where: { name: { endsWith: RUN } } });
  });

  it("admin: manda el correo del pase al correo guardado y no cambia datos", async () => {
    const { prisma } = await import("@/lib/db");
    const { resendPassAsAdmin } = await import("@/app/actions/admin");
    const attendee = await newAttendee();

    const result = await resendPassAsAdmin({}, form(attendee.code));

    expect(result).toEqual({ ok: `Pase reenviado a ${attendee.email}` });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(init.body);
    expect(body.to).toEqual([attendee.email]);
    expect(body.html).toContain(`/pase/${attendee.code}`);
    const after = await prisma.attendee.findUnique({ where: { id: attendee.id } });
    expect(after).toEqual(attendee);
  });

  it("staff sin rol de admin: se rechaza y no sale ningún correo", async () => {
    const { resendPassAsAdmin } = await import("@/app/actions/admin");
    const attendee = await newAttendee();
    cookie = staffToken;

    await expect(resendPassAsAdmin({}, form(attendee.code))).rejects.toThrow("Se requiere rol de administrador");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin sesión: se rechaza", async () => {
    const { resendPassAsAdmin } = await import("@/app/actions/admin");
    const attendee = await newAttendee();
    cookie = undefined;

    await expect(resendPassAsAdmin({}, form(attendee.code))).rejects.toThrow("Sesion no valida");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("si Resend falla, muestra el error con el correo y lo registra", async () => {
    const { resendPassAsAdmin } = await import("@/app/actions/admin");
    const attendee = await newAttendee();
    fetchMock.mockResolvedValue(new Response('{"message":"rate limit"}', { status: 429 }));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await resendPassAsAdmin({}, form(attendee.code));

    expect(result.ok).toBeUndefined();
    expect(result.error).toBe(`No se pudo reenviar el pase a ${attendee.email} (Resend respondió 429). Intenta de nuevo.`);
    expect(errorLog.mock.calls.some(([msg]) => String(msg).includes(`[admin] No se pudo reenviar el pase ${attendee.code}`))).toBe(true);
    errorLog.mockRestore();
  });

  it("si la red a Resend truena, también muestra el error", async () => {
    const { resendPassAsAdmin } = await import("@/app/actions/admin");
    const attendee = await newAttendee();
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await resendPassAsAdmin({}, form(attendee.code));

    expect(result.ok).toBeUndefined();
    expect(result.error).toBe(`No se pudo reenviar el pase a ${attendee.email}. Intenta de nuevo.`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(errorLog.mock.calls.some(([msg]) => String(msg).includes(`[admin] No se pudo reenviar el pase ${attendee.code}`))).toBe(true);
    errorLog.mockRestore();
  });

  it("si la base falla, regresa un error en línea en vez de lanzar", async () => {
    const { prisma } = await import("@/lib/db");
    const { resendPassAsAdmin } = await import("@/app/actions/admin");
    const attendee = await newAttendee();
    // Sin spyOn: el cliente de Prisma no se deja restaurar; la propiedad propia se borra al final.
    Object.defineProperty(prisma, "$queryRaw", { value: () => Promise.reject(new Error("Neon caido")), configurable: true });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const result = await resendPassAsAdmin({}, form(attendee.code));

      expect(result).toEqual({ error: "No se pudo reenviar el pase por un error del servidor. Intenta en un momento." });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(errorLog.mock.calls.some(([msg]) => String(msg).includes(`[admin] Fallo el reenvio del pase ${attendee.code}`))).toBe(true);
    } finally {
      delete (prisma as { $queryRaw?: unknown }).$queryRaw;
      errorLog.mockRestore();
    }
  });

  it("límite: 5 reenvíos por asistente por hora; el sexto no sale y otro asistente no se ve afectado", async () => {
    const { resendPassAsAdmin } = await import("@/app/actions/admin");
    const attendee = await newAttendee();
    const other = await newAttendee();

    for (let i = 0; i < 5; i++) {
      expect((await resendPassAsAdmin({}, form(attendee.code))).ok).toBeDefined();
    }
    const sixth = await resendPassAsAdmin({}, form(attendee.code));
    expect(sixth.error).toMatch(/Ya se intentó reenviar 5 veces en la última hora/);
    expect(fetchMock).toHaveBeenCalledTimes(5);

    expect((await resendPassAsAdmin({}, form(other.code))).ok).toBe(`Pase reenviado a ${other.email}`);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("los intentos fallidos también cuentan contra el límite", async () => {
    const { resendPassAsAdmin } = await import("@/app/actions/admin");
    const attendee = await newAttendee();
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    for (let i = 0; i < 5; i++) expect((await resendPassAsAdmin({}, form(attendee.code))).error).toMatch(/No se pudo/);
    expect((await resendPassAsAdmin({}, form(attendee.code))).error).toMatch(/Ya se intentó reenviar 5 veces/);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    errorLog.mockRestore();
  });

  it("dos clics simultáneos cuentan los dos contra el límite", async () => {
    const { prisma } = await import("@/lib/db");
    const { resendPassAsAdmin } = await import("@/app/actions/admin");
    const attendee = await newAttendee();

    await Promise.all([resendPassAsAdmin({}, form(attendee.code)), resendPassAsAdmin({}, form(attendee.code))]);
    const row = await prisma.authThrottle.findUnique({ where: { key: `admin:reenvio:${attendee.id}` } });
    expect(row?.failures).toBe(2);
  });

  it("asistente sin correo o código inexistente: error claro, sin envío", async () => {
    const { resendPassAsAdmin } = await import("@/app/actions/admin");
    const noEmail = await newAttendee(null);

    expect(await resendPassAsAdmin({}, form(noEmail.code))).toEqual({ error: "Este asistente no tiene correo registrado." });
    expect(await resendPassAsAdmin({}, form(`${CODE_PREFIX}ZZZ`))).toEqual({ error: "Ese asistente ya no existe." });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
