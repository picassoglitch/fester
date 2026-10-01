import type { Metadata } from "next";

// /pase y /pase/{code} son personales: fuera de los buscadores.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PassLayout({ children }: { children: React.ReactNode }) {
  return children;
}
