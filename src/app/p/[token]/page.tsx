import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PagoCargando } from "@/components/web/cargando";
import { PagoScreen } from "@/components/pago-screen";
import { TOKEN_RE } from "@/lib/cobros";

async function Pago({ params }: Pick<PageProps<"/p/[token]">, "params">) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) notFound();
  return <PagoScreen token={token} />;
}

export default function PagoPage({ params }: PageProps<"/p/[token]">) {
  return (
    <Suspense fallback={<PagoCargando />}>
      <Pago params={params} />
    </Suspense>
  );
}
