"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EscritorioCobrar } from "@/components/web/escritorio-cobrar";
import type { Cobro } from "@/lib/cobros";
import { aplicarTecla } from "@/lib/talonario";

/**
 * Cobrar (/): el estado y los handlers del monto y del concepto. La pantalla es la misma
 * en el celular y en el computador; solo cambia la distribución.
 */
export function TalonarioScreen() {
  const router = useRouter();
  const [digitos, setDigitos] = useState("");
  const [concepto, setConcepto] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState(false);

  const monto = Number(digitos);

  async function cobrar() {
    if (monto <= 0 || creando) return;
    setCreando(true);
    setError(false);
    try {
      const r = await fetch("/api/cobros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto, concepto }),
      });
      if (r.status === 403) {
        const cuerpo = await r.json().catch(() => null);
        if (cuerpo?.error === "registro_requerido") {
          router.push("/registro?obligatorio=1");
          return;
        }
      }
      if (!r.ok) throw new Error(String(r.status));
      const { cobro } = (await r.json()) as { cobro: Cobro };
      // La pantalla se conserva en caché al navegar: déjala lista para el próximo cobro.
      setDigitos("");
      setConcepto("");
      setCreando(false);
      router.push(`/cobro/${cobro.id}`);
    } catch {
      setError(true);
      setCreando(false);
    }
  }

  return (
    <EscritorioCobrar
      monto={monto}
      concepto={concepto}
      creando={creando}
      error={error}
      onConcepto={setConcepto}
      onTecla={(t) => setDigitos((d) => aplicarTecla(d, t))}
      onDigitos={setDigitos}
      onCobrar={cobrar}
    />
  );
}
