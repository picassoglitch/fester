// Aldo 2026-11-05 — registro en la puerta: staff (con Entrada) y QR para registrarse solo; ninguno entra a la rifa.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { ensureStations, hasLocalDb } from "./db";

const session: { id: string; name: string; role: "STAFF" | "PRIZES" | "ADMIN"; sessionVersion: number } = {
  id: "",
  name: "Staff Puerta",
  role: "STAFF",
  sessionVersion: 0,
};
const setAttendeeSessionCookie = vi.fn();
vi.mock("@/lib/auth", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth")>()),
  requireSession: vi.fn(async () => session),
  setAttendeeSessionCookie,
}));
const sendMail = vi.fn();
vi.mock("@/lib/mail", () => ({ sendMail }));
let ip = "ip-inicial";
vi.mock("@/lib/throttle", async (orig) => ({
  ...(await orig<typeof import("@/lib/throttle")>()),
  clientIpHash: vi.fn(async () => ip),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const RUN = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const mail = (tag: string) => `puerta-${tag}-${RUN}@example.com`;
// Durante el evento: el QR de la puerta vence al terminar el 5 de noviembre en CDMX.
const DURING_EVENT = new Date("2026-11-05T18:00:00Z");

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe.skipIf(!hasLocalDb)("registro en la puerta (base local)", () => {
  const fillerPrefix = `PF${RUN.slice(-4).toUpperCase()}`;

  beforeAll(async () => {
    const { prisma } = await import("@/lib/db");
    await ensureStations();
    const staff = await prisma.staff.create({ data: { name: "Staff Puerta", pinHash: "x" } });
    session.id = staff.id;
  });

  beforeEach(() => {
    session.role = "STAFF";
    sendMail.mockReset();
    sendMail.mockResolvedValue({ ok: true });
    setAttendeeSessionCookie.mockReset();
    ip = `ip-${Math.random()}`;
  });

  afterAll(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.attendee.deleteMany({ where: { email: { endsWith: `-${RUN}@example.com` } } });
    await prisma.attendee.deleteMany({ where: { code: { startsWith: fillerPrefix } } });
    await prisma.authThrottle.deleteMany({ where: { key: { startsWith: "puerta:" } } });
    await prisma.staff.delete({ where: { id: session.id } });
    await prisma.$disconnect();
  });

  describe("staff", () => {
    it("crea el pase PUERTA sin código por correo, marca Entrada y manda el correo", async () => {
      const { prisma } = await import("@/lib/db");
      const { registerWalkIn } = await import("@/app/actions/door");
      const email = mail("nuevo");

      const state = await registerWalkIn({}, form({ email: email.toUpperCase(), name: "Ana Puerta", position: "Arquitecto" }));

      expect(state.error).toBeUndefined();
      expect(state.pass).toMatchObject({ name: "Ana Puerta", created: true, mailFailed: false });
      expect(state.pass?.qrValue).toMatch(new RegExp(`/s/${state.pass?.code}$`));
      expect(state.entry).toMatchObject({ status: "entrada" });
      const attendee = await prisma.attendee.findFirstOrThrow({ where: { email }, include: { accesses: true } });
      expect(attendee).toMatchObject({ origin: "PUERTA", position: "Arquitecto", emailVerifiedAt: null, privacyAt: null, age: null });
      expect(attendee.insideAt).not.toBeNull();
      expect(attendee.accesses).toMatchObject([{ kind: "ENTRY", staffId: session.id, override: false }]);
      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(sendMail.mock.calls[0][0]).toMatchObject({ to: email });
      expect(await prisma.emailVerification.count({ where: { email } })).toBe(0);
    });

    it("si el correo falla (error o excepción) el pase queda y se avisa", async () => {
      const { prisma } = await import("@/lib/db");
      const { registerWalkIn } = await import("@/app/actions/door");
      sendMail.mockResolvedValueOnce({ ok: false, error: "Resend caído" });
      const failed = await registerWalkIn({}, form({ email: mail("fallo"), name: "Beto Fallo", position: "DIY" }));
      sendMail.mockRejectedValueOnce(new Error("timeout"));
      const thrown = await registerWalkIn({}, form({ email: mail("lanza"), name: "Caro Lanza", position: "DIY" }));

      for (const state of [failed, thrown]) {
        expect(state.pass).toMatchObject({ created: true, mailFailed: true });
        expect(state.entry).toMatchObject({ status: "entrada" });
      }
      expect(await prisma.attendee.count({ where: { email: { in: [mail("fallo"), mail("lanza")] } } })).toBe(2);
    });

    it("correo repetido: muestra el pase que ya existía y le da Entrada", async () => {
      const { prisma } = await import("@/lib/db");
      const { registerWalkIn } = await import("@/app/actions/door");
      const email = mail("web");
      await prisma.attendee.create({ data: { code: `W${RUN.slice(-6).toUpperCase()}`, name: "Dora Web", email, position: "DIY" } });

      const first = await registerWalkIn({}, form({ email, name: "Otro Nombre", position: "Albañil" }));
      const again = await registerWalkIn({}, form({ email, name: "Otro Nombre", position: "Albañil" }));

      expect(first.pass).toMatchObject({ code: `W${RUN.slice(-6).toUpperCase()}`, name: "Dora Web", created: false });
      expect(first.entry).toMatchObject({ status: "entrada" });
      expect(again.entry).toMatchObject({ status: "ya-dentro" });
      const rows = await prisma.attendee.findMany({ where: { email } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ origin: "WEB", name: "Dora Web", position: "DIY" });
      expect(sendMail).not.toHaveBeenCalled();
    });

    it("valida correo, nombre y puesto como el formulario web y no crea nada", async () => {
      const { prisma } = await import("@/lib/db");
      const { registerWalkIn } = await import("@/app/actions/door");
      const email = mail("invalido");
      const cases: [Record<string, string>, string][] = [
        [{ email: "no-es-correo", name: "Eva Prueba", position: "DIY" }, "El correo no parece válido."],
        [{ email, name: "E", position: "DIY" }, "Escribe tu nombre completo."],
        [{ email, name: "Eva Prueba", position: "Astronauta" }, "Selecciona tu puesto o cargo."],
        [{ email, name: "Eva Prueba", position: "Otro" }, "Escribe tu respuesta en el campo de \"Otro\"."],
      ];
      for (const [fields, error] of cases) {
        expect(await registerWalkIn({}, form(fields))).toEqual({ error });
      }
      const ok = await registerWalkIn({}, form({ email, name: "Eva Prueba", position: "Otro", positionOther: "Ingeniera" }));
      expect(ok.pass?.created).toBe(true);
      expect(await prisma.attendee.findFirstOrThrow({ where: { email } })).toMatchObject({ position: "Otro: Ingeniera" });
    });

    it("Premios no registra en la puerta", async () => {
      const { prisma } = await import("@/lib/db");
      const { admitWalkIn, registerWalkIn } = await import("@/app/actions/door");
      session.role = "PRIZES";
      const email = mail("premios");
      expect(await registerWalkIn({}, form({ email, name: "Fer Premios", position: "DIY" }))).toEqual({
        error: "No tienes permiso para registrar en la puerta.",
      });
      expect(await admitWalkIn("ABC123", true)).toMatchObject({ status: "error" });
      expect(await prisma.attendee.count({ where: { email } })).toBe(0);
    });

    it("con el foro lleno pide «Dejar pasar»; el pase queda creado y afuera hasta confirmar", async () => {
      const { prisma } = await import("@/lib/db");
      const { CAPACITY, INSIDE } = await import("@/lib/access");
      const { admitWalkIn, registerWalkIn } = await import("@/app/actions/door");
      const missing = CAPACITY - (await prisma.attendee.count({ where: INSIDE }));
      await prisma.attendee.createMany({
        data: Array.from({ length: Math.max(0, missing) }, (_, i) => ({
          code: `${fillerPrefix}${i}`,
          name: "Relleno Foro",
          insideAt: new Date(),
        })),
      });
      try {
        const email = mail("lleno");
        const state = await registerWalkIn({}, form({ email, name: "Gil Lleno", position: "DIY" }));
        expect(state.pass?.created).toBe(true);
        expect(state.entry).toMatchObject({ status: "confirmar", inside: CAPACITY });
        expect((await prisma.attendee.findFirstOrThrow({ where: { email } })).insideAt).toBeNull();

        const admitted = await admitWalkIn(state.pass!.code, true);
        expect(admitted).toEqual({ status: "entrada", inside: CAPACITY + 1 });
        const access = await prisma.access.findFirstOrThrow({ where: { attendee: { email } } });
        expect(access).toMatchObject({ kind: "ENTRY", override: true });
      } finally {
        await prisma.attendee.deleteMany({ where: { code: { startsWith: fillerPrefix } } });
      }
    });

    it("sin estación Registro activa el pase se crea y avisa que la entrada no se marcó", async () => {
      const { prisma } = await import("@/lib/db");
      const { registerWalkIn } = await import("@/app/actions/door");
      const registro = await prisma.station.findMany({ where: { active: true, name: { equals: "registro", mode: "insensitive" } } });
      await prisma.station.updateMany({ where: { id: { in: registro.map((s) => s.id) } }, data: { active: false } });
      try {
        const state = await registerWalkIn({}, form({ email: mail("sinregistro"), name: "Hugo Sin", position: "DIY" }));
        expect(state.pass?.created).toBe(true);
        expect(state.entry).toMatchObject({ status: "error" });
      } finally {
        await prisma.station.updateMany({ where: { id: { in: registro.map((s) => s.id) } }, data: { active: true } });
      }
    });

    it("los de la puerta no entran a la rifa aunque estén aprobados y completos", async () => {
      const { prisma } = await import("@/lib/db");
      const { RAFFLE_POOL, getReelNames } = await import("@/lib/raffle");
      const done = new Date();
      const name = `Rifa Puerta ${RUN}`;
      await prisma.attendee.createMany({
        data: [
          { code: `RP${RUN.slice(-6).toUpperCase()}`, name, email: mail("rifa-puerta"), origin: "PUERTA", approved: true, completedAt: done },
          { code: `RW${RUN.slice(-6).toUpperCase()}`, name: `Rifa Web ${RUN}`, email: mail("rifa-web"), approved: true, completedAt: done },
        ],
      });
      const pool = await prisma.attendee.findMany({ where: { AND: [RAFFLE_POOL, { email: { endsWith: `-${RUN}@example.com` } }] } });
      expect(pool.map((a) => a.name)).toEqual([`Rifa Web ${RUN}`]);
      expect(await getReelNames(100_000)).not.toContain(name);
    });
  });

  describe("QR para registrarse solo", () => {
    beforeAll(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(DURING_EVENT);
    });
    afterAll(() => {
      vi.useRealTimers();
    });

    async function token() {
      const { createDoorToken } = await import("@/lib/door-token");
      return createDoorToken();
    }

    it("con token válido crea el pase PUERTA, lo muestra y no marca Entrada", async () => {
      const { prisma } = await import("@/lib/db");
      const { selfRegisterAtDoor } = await import("@/app/actions/door");
      const email = mail("solo");
      const state = await selfRegisterAtDoor({}, form({ t: await token(), email, name: "Iris Sola", position: "Estudiante" }));

      expect(state.pass).toMatchObject({ name: "Iris Sola", created: true, mailFailed: false });
      const attendee = await prisma.attendee.findFirstOrThrow({ where: { email }, include: { accesses: true } });
      expect(attendee).toMatchObject({ origin: "PUERTA", position: "Estudiante", insideAt: null, accesses: [] });
      expect(state.pass?.code).toBe(attendee.code);
      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(setAttendeeSessionCookie).toHaveBeenCalledWith(expect.objectContaining({ code: attendee.code, email }));
    });

    it("sin token, con token falso, vencido o de otro tipo responde registro cerrado y no crea nada", async () => {
      const { prisma } = await import("@/lib/db");
      const { selfRegisterAtDoor } = await import("@/app/actions/door");
      const { createAttendeeToken, createSessionToken, getSecret } = await import("@/lib/auth");
      const { REGISTRATION_CLOSED } = await import("@/lib/event");
      const email = mail("sin-token");
      const forged = await new SignJWT({ scope: "puerta" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode("otro-secreto-que-no-es-el-del-servidor"));
      const expired = await new SignJWT({ scope: "puerta" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(Math.floor(DURING_EVENT.getTime() / 1000) - 60)
        .sign(getSecret());
      const staffToken = await createSessionToken({ id: session.id, name: "x", role: "ADMIN", sessionVersion: 0 });
      const attendeeToken = await createAttendeeToken({ id: "a", code: "ABC123", name: "x", email });

      for (const t of [undefined, "", "basura", forged, expired, staffToken, attendeeToken]) {
        const fields: Record<string, string> = { email, name: "Juan Sin", position: "DIY" };
        if (t !== undefined) fields.t = t;
        expect(await selfRegisterAtDoor({}, form(fields))).toEqual({ error: REGISTRATION_CLOSED.error });
      }
      expect(await prisma.attendee.count({ where: { email } })).toBe(0);
      expect(sendMail).not.toHaveBeenCalled();
    });

    it("el token deja de valer al terminar el día del evento", async () => {
      const { isValidDoorToken, DOOR_SIGNUP_UNTIL } = await import("@/lib/door-token");
      const t = await token();
      expect(await isValidDoorToken(t, new Date(DOOR_SIGNUP_UNTIL.getTime() - 1000))).toBe(true);
      expect(await isValidDoorToken(t, new Date(DOOR_SIGNUP_UNTIL.getTime() + 1000))).toBe(false);
    });

    it("el token de la puerta no sirve como sesión de staff", async () => {
      const { verifySessionToken } = await import("@/lib/auth");
      expect(await verifySessionToken(await token())).toBeNull();
    });

    it("correo con pase: no muestra código ni nombre, se lo reenvía a ese correo", async () => {
      const { prisma } = await import("@/lib/db");
      const { selfRegisterAtDoor } = await import("@/app/actions/door");
      const { DOOR_EXISTING_NOTICE } = await import("@/lib/door");
      const email = mail("ajeno");
      const code = `A${RUN.slice(-6).toUpperCase()}`;
      await prisma.attendee.create({ data: { code, name: "Karla Secreta", email, position: "DIY" } });

      const state = await selfRegisterAtDoor({}, form({ t: await token(), email, name: "Intruso", position: "DIY" }));

      expect(state).toEqual({ notice: DOOR_EXISTING_NOTICE });
      expect(JSON.stringify(state)).not.toMatch(new RegExp(`${code}|Karla|Secreta`));
      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(sendMail.mock.calls[0][0]).toMatchObject({ to: email });
      expect(sendMail.mock.calls[0][0].text).toContain(code);
      expect(setAttendeeSessionCookie).not.toHaveBeenCalled();
      expect(await prisma.attendee.count({ where: { email } })).toBe(1);
    });

    it("el reenvío al mismo correo tiene tope por hora", async () => {
      const { prisma } = await import("@/lib/db");
      const { selfRegisterAtDoor } = await import("@/app/actions/door");
      const { DOOR_RESEND_PER_HOUR } = await import("@/lib/door");
      const email = mail("reenvio");
      await prisma.attendee.create({ data: { code: `R${RUN.slice(-6).toUpperCase()}`, name: "Reenvío", email } });
      const t = await token();
      for (let i = 0; i < DOOR_RESEND_PER_HOUR + 2; i++) {
        await selfRegisterAtDoor({}, form({ t, email, name: "Otra Vez", position: "DIY" }));
      }
      expect(sendMail).toHaveBeenCalledTimes(DOOR_RESEND_PER_HOUR);
    });

    it("limita los registros por IP", async () => {
      const { prisma } = await import("@/lib/db");
      const { selfRegisterAtDoor } = await import("@/app/actions/door");
      const { DOOR_SIGNUP_LIMIT } = await import("@/lib/door");
      const t = await token();
      const results = [];
      for (let i = 0; i <= DOOR_SIGNUP_LIMIT.perIp; i++) {
        results.push(await selfRegisterAtDoor({}, form({ t, email: mail(`ip${i}`), name: "Luis Limite", position: "DIY" })));
      }
      expect(results.slice(0, DOOR_SIGNUP_LIMIT.perIp).every((r) => r.pass?.created)).toBe(true);
      expect(results.at(-1)?.error).toMatch(/Demasiados registros/);
      expect(await prisma.attendee.count({ where: { email: mail(`ip${DOOR_SIGNUP_LIMIT.perIp}`) } })).toBe(0);
    });

    it("el formulario público sigue cerrado aunque el POST traiga un token de puerta", async () => {
      const { prisma } = await import("@/lib/db");
      const { registerAttendee } = await import("@/app/actions/register");
      const { REGISTRATION_CLOSED } = await import("@/lib/event");
      const email = mail("publico");
      const state = await registerAttendee(
        {},
        form({ t: await token(), email, name: "Mara Publica", position: "DIY", stage: "verify", verificationCode: "123456" }),
      );
      expect(state).toEqual({ error: REGISTRATION_CLOSED.error });
      expect(await prisma.attendee.count({ where: { email } })).toBe(0);
    });
  });
});
