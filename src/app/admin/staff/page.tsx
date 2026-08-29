import { prisma } from "@/lib/db";
import { toggleStaff } from "@/app/actions/admin";
import { ResetPinForm, StaffForm } from "@/components/StaffForm";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
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
      </div>

      <section className="card p-5">
        <StaffForm />
      </section>

      <ul className="space-y-3">
        {staff.map((person) => (
          <li key={person.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">
                {person.name}
                {person.role === "ADMIN" && (
                  <span className="ml-2 rounded-full bg-brand/25 px-2 py-0.5 text-xs text-white/80">
                    admin
                  </span>
                )}
                {!person.active && (
                  <span className="ml-2 rounded-full bg-white/8 px-2 py-0.5 text-xs text-white/50">
                    inactivo
                  </span>
                )}
              </p>
              <p className="text-xs text-white/45">{person._count.scans} escaneos registrados</p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
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
