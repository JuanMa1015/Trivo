import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CobroCargando } from "@/components/web/cargando";
import { CobroScreen } from "@/components/cobro-screen";

async function Cobro({ params }: Pick<PageProps<"/cobro/[numero]">, "params">) {
  const { numero } = await params;
  if (!/^\d{1,6}$/.test(numero)) notFound();
  return <CobroScreen numero={Number(numero)} />;
}

export default function CobroPage({ params }: PageProps<"/cobro/[numero]">) {
  return (
    <Suspense fallback={<CobroCargando />}>
      <Cobro params={params} />
    </Suspense>
  );
}
