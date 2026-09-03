import Icon, { type IconName } from "@/components/landing/Icon";

/**
 * Encabezado de seccion del mockup: glifo en un recuadro azul y titulo en
 * versalitas negras. `as` permite bajar de nivel cuando el titulo es secundario.
 */
export default function SectionTitle({
  icon,
  children,
  as: Heading = "h2",
  className = "",
}: {
  icon: IconName;
  children: React.ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-sky/25 bg-navy/40 text-sky">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <Heading className="text-2xl font-black uppercase leading-none tracking-tight sm:text-3xl">
        {children}
      </Heading>
    </div>
  );
}
