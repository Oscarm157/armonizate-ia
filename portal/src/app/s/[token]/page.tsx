import { porToken } from "@/lib/datos";
import { VistaPaciente } from "./VistaPaciente";

export const dynamic = "force-dynamic";
// Es la fotografía de un paciente: fuera de los buscadores.
// Esta página se manda por WhatsApp, así que su vista previa la lee el paciente: nada de
// "herramienta interna" heredado del layout, y nada que diga quién es ni qué se ve.
export const metadata = {
  title: "Tu simulación · Clínica Armonízate",
  description: "Tu simulación de Otomodelación. El enlace es personal y dura 24 horas.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Tu simulación · Clínica Armonízate",
    description: "Tu simulación de Otomodelación. El enlace es personal y dura 24 horas.",
    type: "website",
  },
};

/**
 * La página que ve el paciente. Sin sesión: lo único que puede accionar es el botón de
 * WhatsApp de su sucursal.
 *
 * Se le manda esto y no la imagen porque un enlace se puede caducar: una fotografía
 * reenviada por WhatsApp ya no se puede retirar nunca.
 */
export default async function EnlacePublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sim = await porToken(token);
  return <VistaPaciente token={token} sim={sim} />;
}
