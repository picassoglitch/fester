/**
 * Encabezado de seccion del mockup: titulo en versalitas negras seguido de una
 * linea roja corta. `as` permite bajar de nivel cuando el titulo es secundario.
 */
export default function SectionTitle({
  children,
  as: Heading = "h2",
  className = "",
}: {
  children: React.ReactNode;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <Heading
      className={`flex items-center gap-4 text-2xl font-black uppercase leading-none tracking-tight sm:text-3xl ${className}`}
    >
      <span>{children}</span>
      <span aria-hidden className="h-0.5 w-10 shrink-0 bg-brand" />
    </Heading>
  );
}
