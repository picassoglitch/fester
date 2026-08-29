import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/app/actions/session";
import FesterLogo from "@/components/FesterLogo";

const NAV = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/asistentes", label: "Asistentes" },
  { href: "/admin/estaciones", label: "Estaciones" },
  { href: "/admin/staff", label: "Staff" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <FesterLogo className="h-7" />
            <span className="sr-only">Panel Fester</span>
          </Link>
          <nav className="-mx-1 flex flex-1 items-center gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-white/70 hover:bg-white/8 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-xs text-white/50">
            <span className="hidden sm:inline">{session.name}</span>
            <Link href="/staff/escanear" className="underline underline-offset-4">
              Escanear
            </Link>
            <form action={logout}>
              <button type="submit" className="underline underline-offset-4">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
