import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { RecordatorioRegistro } from "@/components/recordatorio-registro";
import { AvisoConexion } from "@/components/aviso-conexion";
import "./globals.css";

// Fuente del diseño de escritorio. Se aloja con la app (el navegador no llama a
// Google) y solo se aplica desde lg; el móvil sigue con su Helvetica.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trivo",
  description:
    "Cobros, historial de ventas y topes tributarios para comercios.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <RecordatorioRegistro />
        </Suspense>
        <AvisoConexion />
        {children}
      </body>
    </html>
  );
}
