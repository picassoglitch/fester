import type { Metadata, Viewport } from "next";
import { Barlow_Condensed } from "next/font/google";
import { EVENT } from "@/lib/event";
import "./globals.css";

/** Condensada para titulos, como en el mockup aprobado. El cuerpo sigue en la fuente del sistema. */
const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${EVENT.name} ${EVENT.year} · ${EVENT.tagline}`,
    template: `%s · ${EVENT.name} ${EVENT.year}`,
  },
  description: `${EVENT.name} ${EVENT.year}. ${EVENT.dateLabel}, ${EVENT.city}. Registro sin costo al encuentro de soluciones Fester para la construcción.`,
};

export const viewport: Viewport = {
  themeColor: "#004f92",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={display.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
