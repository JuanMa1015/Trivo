import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PagoScreen } from "@/components/pago-screen";

async function Pago({ params }: Pick<PageProps<"/p/[codigo]">, "params">) {
  const { codigo } = await params;
  if (!/^\d{6}$/.test(codigo)) notFound();
  return <PagoScreen codigo={codigo} />;
}

export default function PagoPage({ params }: PageProps<"/p/[codigo]">) {
  return (
    <Suspense fallback={null}>
      <Pago params={params} />
    </Suspense>
  );
}
