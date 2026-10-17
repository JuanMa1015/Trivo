import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CobroScreen } from "@/components/cobro-screen";
import { uuidDeRuta } from "@/server/http";

async function Cobro({ params }: Pick<PageProps<"/cobro/[id]">, "params">) {
  const id = uuidDeRuta((await params).id);
  if (id === null) notFound();
  return <CobroScreen id={id} />;
}

export default function CobroPage({ params }: PageProps<"/cobro/[id]">) {
  return (
    <Suspense fallback={null}>
      <Cobro params={params} />
    </Suspense>
  );
}
