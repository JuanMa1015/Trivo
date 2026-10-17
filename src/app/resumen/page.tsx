import { Suspense } from "react";
import { ResumenScreen } from "@/components/resumen-screen";

// El resumen depende de la hora actual: se resuelve en el navegador, no al prerenderizar.
export default function ResumenPage() {
  return (
    <Suspense fallback={null}>
      <ResumenScreen />
    </Suspense>
  );
}
