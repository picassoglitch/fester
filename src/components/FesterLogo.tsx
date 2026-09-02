import Image from "next/image";

/**
 * Logotipo oficial de Fester, recortado del arte de la campaña con fondo
 * transparente (public/fester-logo.png). Si marketing entrega el vectorial,
 * se sustituye el archivo y este componente no cambia.
 */
export default function FesterLogo({ className = "h-9" }: { className?: string }) {
  return (
    <Image
      src="/fester-logo.png"
      alt="Fester"
      width={614}
      height={271}
      loading="eager"
      className={`w-auto ${className}`}
    />
  );
}
