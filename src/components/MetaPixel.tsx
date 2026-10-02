"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { META_PIXEL_ID, pixelAllowed, trackPixel } from "@/lib/meta-pixel";

/**
 * Meta Pixel solo en el dominio oficial (los previews y el espejo *.vercel.app
 * no ensucian los datos) y fuera de las rutas con el codigo del pase.
 * El codigo base cuenta la primera carga; las navegaciones del lado del cliente
 * las cuenta el efecto (antes de que cargue el script fbq no existe y no hace nada).
 */
export default function MetaPixel() {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const ok = pixelAllowed(window.location.host, pathname);
    setAllowed((current) => current || ok);
    if (ok) trackPixel("PageView");
  }, [pathname]);

  if (!allowed) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
    </Script>
  );
}
