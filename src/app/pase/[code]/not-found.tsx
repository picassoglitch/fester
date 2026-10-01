import Link from "next/link";
import FesterLogo from "@/components/FesterLogo";

export default function PassNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <FesterLogo className="h-9" />
      <h1 className="text-2xl font-bold">Pase no encontrado</h1>
      <p className="text-sm text-white/60">
        Ese código de pase no existe. Revísalo o crea un pase nuevo.
      </p>
      <Link href="/" className="btn btn-primary">
        Crear mi pase
      </Link>
    </main>
  );
}
