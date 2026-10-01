import { beforeEach, describe, expect, it, vi } from "vitest";

const afterCallbacks: (() => Promise<void>)[] = [];
const issueEmailCode = vi.fn(async () => ({ ok: true as const }));
const findFirst = vi.fn();

vi.mock("next/server", () => ({ after: (cb: () => Promise<void>) => afterCallbacks.push(cb) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  clearAttendeeSessionCookie: vi.fn(),
  getAttendeeSession: vi.fn(),
  setAttendeeSessionCookie: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: { attendee: { findFirst } } }));
const sendMail = vi.fn();
vi.mock("@/lib/mail", () => ({ sendMail }));
vi.mock("@/lib/throttle", () => ({ clientIpHash: vi.fn(async () => "iphash") }));
vi.mock("@/lib/verification", async (orig) => ({
  ...(await orig<typeof import("@/lib/verification")>()),
  issueEmailCode,
}));

function form(email: string) {
  const data = new FormData();
  data.set("email", email);
  data.set("stage", "email");
  return data;
}

async function run(email: string) {
  const { accessAccount } = await import("@/app/actions/account");
  const state = await accessAccount({}, form(email));
  for (const cb of afterCallbacks.splice(0)) await cb();
  return state;
}

beforeEach(() => {
  issueEmailCode.mockClear();
  findFirst.mockReset();
});

describe("accessAccount", () => {
  it("responde igual con un correo registrado y uno sin registro", async () => {
    findFirst.mockResolvedValueOnce({ id: "a1", code: "ABC123", name: "Ana" });
    const known = await run("registrada@example.com");
    expect(issueEmailCode).toHaveBeenCalledTimes(1);
    expect(issueEmailCode).toHaveBeenCalledWith("registrada@example.com", "LOGIN", "iphash");

    findFirst.mockResolvedValueOnce(null);
    const unknown = await run("nadie@example.com");
    expect(issueEmailCode).toHaveBeenCalledTimes(1);
    expect(sendMail).not.toHaveBeenCalled();

    const { email: _a, ...knownRest } = known;
    const { email: _b, ...unknownRest } = unknown;
    expect(knownRest).toEqual(unknownRest);
    expect(knownRest).toEqual({
      stage: "code",
      notice: "Si ese correo tiene un registro, te enviamos un código de 6 dígitos. Revisa tu bandeja y tu carpeta de spam.",
    });
  });

  it("cooldown o limite por hora tambien dan el aviso generico", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    findFirst.mockResolvedValueOnce({ id: "a1", code: "ABC123", name: "Ana" });
    issueEmailCode.mockResolvedValueOnce({ ok: false, error: "x", reason: "rate-limit" } as never);
    const state = await run("registrada@example.com");
    expect(state).toMatchObject({ stage: "code", notice: expect.stringContaining("Si ese correo") });
    expect(state.error).toBeUndefined();
  });
});
