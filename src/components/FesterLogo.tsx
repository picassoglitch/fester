/**
 * Marca Fester dibujada en SVG (ovalo rojo + logotipo blanco).
 * Es una reconstruccion tipografica: si marketing entrega el SVG oficial,
 * basta con sustituir el contenido de este componente.
 */
export default function FesterLogo({ className = "h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 64"
      role="img"
      aria-label="Fester"
      className={className}
      style={{ width: "auto" }}
    >
      <ellipse cx="80" cy="32" rx="78" ry="30" fill="#e2001a" />
      <ellipse cx="80" cy="32" rx="72" ry="24.5" fill="none" stroke="#ffffff" strokeWidth="2" />
      <text
        x="80"
        y="41"
        textAnchor="middle"
        fill="#ffffff"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="30"
        fontStyle="italic"
        fontWeight="700"
        letterSpacing="0.5"
      >
        Fester
      </text>
      <text x="140" y="24" fill="#ffffff" fontFamily="inherit" fontSize="9">
        ®
      </text>
    </svg>
  );
}
