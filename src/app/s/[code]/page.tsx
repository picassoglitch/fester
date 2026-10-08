import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { normalizeCode } from "@/lib/codes";
import { staffCodeTarget } from "@/lib/safe-redirect";

export const dynamic = "force-dynamic";

/**
 * Destino de los codigos QR. El staff (con sesion abierta) cae en la pantalla de
 * su rol con el pase precargado (estaciones o premios); el asistente cae en su
 * propio pase.
 */
export default async function ScanTargetPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = normalizeCode(code);
  const session = await getSession();

  if (session) redirect(staffCodeTarget(clean, session.role));
  redirect(`/pase/${clean}`);
}
