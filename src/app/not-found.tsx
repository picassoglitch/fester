import Link from "next/link";
import type { Metadata } from "next";
import FesterLogo from "@/components/FesterLogo";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <FesterLogo className="h-9" />
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="text-sm text-white/60">
        La dirección que abriste no existe o ya no está disponible.
      </p>
      <Link href="/" className="btn btn-primary">
        Volver al inicio
      </Link>
    </main>
  );
}
