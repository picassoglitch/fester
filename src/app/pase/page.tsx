"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeCode } from "@/lib/codes";
import FesterLogo from "@/components/FesterLogo";

export default function RecoverPassPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSaved(localStorage.getItem("fester_code"));
    } catch {
      /* modo privado */
    }
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-5 py-10">
      <header className="flex flex-col items-center text-center">
        <FesterLogo className="h-9" />
        <h1 className="mt-4 text-2xl font-bold">Abrir mi pase</h1>
        <p className="mt-2 text-sm text-white/60">Escribe el código que aparece en tu pase.</p>
      </header>

      {saved && (
        <Link href={`/pase/${saved}`} className="btn btn-ghost w-full">
          Continuar como <span className="font-mono tracking-widest">{saved}</span>
        </Link>
      )}

      <form
        className="card space-y-3 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const clean = normalizeCode(code);
          if (clean) router.push(`/pase/${clean}`);
        }}
      >
        <input
          className="field text-center font-mono text-2xl uppercase tracking-[0.4em]"
          placeholder="ABC123"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={12}
        />
        <button type="submit" className="btn btn-primary w-full" disabled={code.trim().length < 4}>
          Ver mi pase
        </button>
      </form>

      <Link href="/" className="text-center text-sm text-white/50 underline underline-offset-4">
        No tengo pase, quiero registrarme
      </Link>
    </main>
  );
}
