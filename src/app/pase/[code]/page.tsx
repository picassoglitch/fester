import Link from "next/link";
import type { Metadata } from "next";
import { getAttendeeProgress } from "@/lib/attendee";
import { normalizeCode } from "@/lib/codes";
import { appUrl } from "@/lib/site";
import PassView from "@/components/PassView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mi pase · Fester",
};

export default async function PassPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const progress = await getAttendeeProgress(normalizeCode(code));

  if (!progress) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold">Pase no encontrado</h1>
        <p className="text-sm text-white/60">
          El código <span className="font-mono">{normalizeCode(code)}</span> no existe. Revísalo o
          crea un pase nuevo.
        </p>
        <Link href="/" className="btn btn-primary">
          Crear mi pase
        </Link>
      </main>
    );
  }

  return <PassView initial={progress} qrValue={`${appUrl()}/s/${progress.code}`} />;
}
