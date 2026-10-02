import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPassProgress } from "@/lib/attendee";
import { getAttendeeSession } from "@/lib/auth";
import { normalizeCode } from "@/lib/codes";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/site";
import PassView from "@/components/PassView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi pase",
  robots: { index: false, follow: false },
};

export default async function PassPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeCode(rawCode);
  const progress = await getPublicPassProgress(code);
  if (!progress) notFound();

  // El nombre completo solo se muestra a quien es titular del pase, y viaja como texto
  // plano: el componente cliente nunca recibe el registro completo.
  let fullName: string | undefined;
  const session = await getAttendeeSession();
  if (session && session.code === code) {
    const attendee = await prisma.attendee.findUnique({ where: { code }, select: { name: true } });
    fullName = attendee?.name;
  }

  return (
    <PassView
      initial={progress}
      displayName={fullName ?? progress.firstName}
      qrValue={`${appUrl()}/s/${progress.code}`}
    />
  );
}
