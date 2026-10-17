import { Suspense } from "react";
import { ImpuestosScreen } from "@/components/impuestos-screen";

// Depende de la hora y de lo cobrado: se resuelve en el navegador, no al prerenderizar.
export default function ImpuestosPage() {
  return (
    <Suspense fallback={null}>
      <ImpuestosScreen />
    </Suspense>
  );
}
