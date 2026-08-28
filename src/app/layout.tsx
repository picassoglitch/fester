import type { Metadata, Viewport } from "next";
import { EVENT } from "@/lib/event";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${EVENT.name} ${EVENT.year} · ${EVENT.tagline}`,
    template: `%s · ${EVENT.name} ${EVENT.year}`,
  },
  description: `${EVENT.name} ${EVENT.year}. ${EVENT.dateLabel}, ${EVENT.city}. Registro sin costo al encuentro de soluciones Fester para la construcción.`,
};

export const viewport: Viewport = {
  themeColor: "#04162e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
