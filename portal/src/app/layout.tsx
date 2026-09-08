import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { BotIdClient } from "botid/client";
import { Toaster } from "@/components/ui/sonner";

// El endpoint que llama al modelo cuesta dinero por generación. BotID necesita
// registrarse también del lado del cliente para que la señal valga.
const PROTEGIDO = [{ path: "/api/simular", method: "POST" }];

// Montserrat es la tipografía del sitio de la clínica. El portal usa la misma para
// que el vendedor lo lea como la misma casa.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Simulador · Clínica Armonízate",
  description: "Herramienta interna de simulación de otomodelación.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <head>
        <BotIdClient protect={PROTEGIDO} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
