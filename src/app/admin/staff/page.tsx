import { prisma } from "@/lib/db";
import { toggleStaff } from "@/app/actions/admin";
import { ChangeRoleForm, ResetPinForm, StaffForm } from "@/components/StaffForm";
import { ROLE_LABELS } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const staff = await prisma.staff.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { scans: true } } },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Staff</h1>
        <p className="mt-1 text-sm text-white/55">
          Cada persona entra con su propio PIN, así queda registrado quién escaneó cada pase. Los
          PIN no se pueden consultar después: si alguien lo olvida, asígnale uno nuevo.
        </p>
        <p className="mt-1 text-sm text-white/55">
          Escaneo registra estrellas en las estaciones; Premios solo entrega premios; Administrador
          puede todo. Cambiar el rol cierra la sesión abierta de esa persona.
        </p>
      </div>

      {aviso === "desactivar" && (
        <p className="rounded-lg border border-alert/50 bg-alert/15 px-4 py-3 text-sm text-white">
          No puedes desactivar tu propia cuenta ni al último administrador.
        </p>
      )}

      <section className="card p-5">
        <StaffForm />
      </section>

      <ul className="space-y-3">
        {staff.map((person) => (
          <li key={person.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">
                {person.name}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    person.role === "ADMIN"
                      ? "bg-brand/25 text-white/80"
                      : person.role === "PRIZES"
                        ? "bg-gold/20 text-gold"
                        : "bg-white/8 text-white/70"
                  }`}
                >
                  {ROLE_LABELS[person.role]}
                </span>
                {!person.active && (
                  <span className="ml-2 rounded-full bg-white/8 px-2 py-0.5 text-xs text-white/50">
                    inactivo
                  </span>
                )}
              </p>
              <p className="text-xs text-white/45">{person._count.scans} escaneos registrados</p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <ChangeRoleForm id={person.id} role={person.role} />
              <ResetPinForm id={person.id} />
              <form action={toggleStaff}>
                <input type="hidden" name="id" value={person.id} />
                <button type="submit" className="text-xs text-white/60 underline underline-offset-4">
                  {person.active ? "Desactivar" : "Activar"}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
