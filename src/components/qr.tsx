"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** QR del link de pago, generado en el navegador (no sale ningún dato). */
export function Qr({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    QRCode.toDataURL(texto, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: "M",
      color: { dark: "#1f1f1f", light: "#ffffff" },
    })
      .then((url) => {
        if (activo) setSrc(url);
      })
      .catch(() => {
        if (activo) setSrc(null);
      });
    return () => {
      activo = false;
    };
  }, [texto]);

  if (!src)
    return <div className="size-40 rounded-xl bg-neutral" aria-hidden="true" />;

  return (
    <Image
      src={src}
      alt={etiqueta}
      width={160}
      height={160}
      unoptimized
      className="size-40 rounded-xl"
    />
  );
}
