import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fester · Recorrido de estaciones",
  description: "Registra tu pase, junta estrellas en cada estación y reclama tu premio.",
};

export const viewport: Viewport = {
  themeColor: "#0b0718",
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
