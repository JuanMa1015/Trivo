import { Suspense } from "react";
import { PagarForm } from "@/components/pagar-form";

export default function PagarPage() {
  return (
    <Suspense fallback={null}>
      <PagarForm />
    </Suspense>
  );
}
