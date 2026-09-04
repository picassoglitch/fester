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
      className={`font-display flex items-center gap-4 text-3xl font-bold uppercase leading-none tracking-wide sm:text-4xl ${className}`}
    >
      <span>{children}</span>
      <span aria-hidden className="h-0.5 w-10 shrink-0 bg-brand" />
    </Heading>
  );
}
