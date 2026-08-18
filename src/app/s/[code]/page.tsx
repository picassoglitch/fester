import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { normalizeCode } from "@/lib/codes";

export const dynamic = "force-dynamic";

/**
 * Destino de los codigos QR. El staff (con sesion abierta) cae en la pantalla de
 * registro de estacion; el asistente cae en su propio pase.
 */
export default async function ScanTargetPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = normalizeCode(code);
  const session = await getSession();

  if (session) redirect(`/staff/escanear?code=${clean}`);
  redirect(`/pase/${clean}`);
}
