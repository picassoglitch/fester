import { beforeEach, describe, expect, it, vi } from "vitest";
import { memoryStore } from "./memory-throttle-store";

const getSession = vi.fn();
const sendMail = vi.fn(async () => ({ ok: true as const, simulated: true }));
const store = memoryStore();

vi.mock("@/lib/auth", () => ({ getSession }));
vi.mock("@/lib/mail", () => ({ sendMail, mailFrom: () => "from@example.com", mailReplyTo: () => "reply@example.com" }));
vi.mock("@/lib/throttle", async (orig) => {
  const real = await orig<typeof import("@/lib/throttle")>();
  return {
    ...real,
    consumeRateLimit: (key: string, limit: number, windowMs: number) =>
      real.consumeRateLimit(key, limit, windowMs, new Date(), store),
  };
});

const ADMIN = { id: "admin1", name: "A", role: "ADMIN", sessionVersion: 0 };

function post(headers: Record<string, string>, body = '{"to":"qa@example.com"}') {
  return new Request("http://localhost:3000/api/admin/correo", { method: "POST", headers, body });
}
const OK_HEADERS = { origin: "http://localhost:3000", "content-type": "application/json" };

beforeEach(() => {
  getSession.mockResolvedValue(ADMIN);
  sendMail.mockClear();
  store.rows.clear();
});

describe("/api/admin/correo", () => {
  it("GET -> 405 con Allow: POST y no manda correo", async () => {
    const { GET } = await import("@/app/api/admin/correo/route");
    const res = GET();
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("POST sin sesión de admin -> 401", async () => {
    getSession.mockResolvedValue(null);
    const { POST } = await import("@/app/api/admin/correo/route");
    expect((await POST(post(OK_HEADERS))).status).toBe(401);
  });

  it("POST sin Origin, con otro Origin o sin JSON -> 403", async () => {
    const { POST } = await import("@/app/api/admin/correo/route");
    expect((await POST(post({ "content-type": "application/json" }))).status).toBe(403);
    expect((await POST(post({ ...OK_HEADERS, origin: "https://evil.example" }))).status).toBe(403);
    expect((await POST(post({ origin: OK_HEADERS.origin, "content-type": "text/plain" }))).status).toBe(403);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("la respuesta no dice nada de la API key", async () => {
    const { POST } = await import("@/app/api/admin/correo/route");
    const res = await POST(post(OK_HEADERS));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toMatch(/resendApiKey|largo|empiezaCon|presente/);
    expect(JSON.parse(text)).toMatchObject({ ok: true, resultado: { ok: true }, from: "from@example.com" });
  });

  it("el sexto POST en una hora -> 429", async () => {
    const { POST } = await import("@/app/api/admin/correo/route");
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await POST(post(OK_HEADERS))).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    expect(sendMail).toHaveBeenCalledTimes(5);
  });
});
