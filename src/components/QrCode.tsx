"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export default function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#04162e", light: "#ffffff" },
    }).catch(() => {});
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      className="h-auto w-full max-w-[260px] rounded-2xl bg-white p-3"
      aria-label="Código QR del pase"
    />
  );
}
