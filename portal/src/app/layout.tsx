import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { BotIdClient } from "botid/client";
import { Toaster } from "@/components/ui/sonner";

// El endpoint que llama al modelo cuesta dinero por generación. BotID necesita
// registrarse también del lado del cliente para que la señal valga.
const PROTEGIDO = [{ path: "/api/simular", method: "POST" }];

// Montserrat es la tipografía del sitio de la clínica. El portal usa la misma para
// que el vendedor lo lea como la misma casa.
// Poppins: geométrica y redonda, va con los radios amplios de la marca. El peso
// ligero en los tamaños grandes es lo que le da aire de producto y no de plantilla.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});


export const metadata: Metadata = {
  title: "Simulador · Clínica Armonízate",
  description: "Herramienta interna de simulación de otomodelación.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${poppins.variable} h-full antialiased`}>
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
