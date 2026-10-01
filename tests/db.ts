/**
 * Las pruebas de integracion escriben en la base. Solo corren contra un
 * Postgres local; si DATABASE_URL apunta a otro host se detienen en seco.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function dbHost(): string | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return "invalid";
  }
}

const host = dbHost();
if (host && !LOCAL_HOSTS.has(host)) {
  throw new Error("DATABASE_URL no es local: las pruebas de integracion no corren contra esa base.");
}

/** true cuando hay una base local configurada para las pruebas de integracion. */
export const hasLocalDb = host !== null;

export async function ensureStations() {
  const { prisma } = await import("@/lib/db");
  const count = await prisma.station.count({ where: { active: true } });
  if (count > 0) return;
  const names = ["Registro", "Kiosko 1", "Kiosko 2", "Kiosko 3", "Kiosko 4", "Kiosko 5"];
  await prisma.station.createMany({
    data: names.map((name, index) => ({ name, order: index + 1 })),
  });
}

export function testCode(): string {
  return `T${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}
