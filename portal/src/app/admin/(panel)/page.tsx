import { requireUser } from "@/lib/session";
import { consumoDelMes, TOPE_MENSUAL } from "@/lib/datos";
import { PageHeader } from "@/components/crm/PageShell";
import { Simulador } from "@/components/simulador/Simulador";

export const dynamic = "force-dynamic";
export const metadata = { title: "Simulador", robots: { index: false } };

export default async function SimuladorPage() {
  const me = await requireUser();
  const usadas = await consumoDelMes(me.id);

  return (
    <div className="crm-fade mx-auto max-w-[1180px]">
      <PageHeader
        eyebrow="Herramienta"
        title="Simulador de otomodelación"
        description="Sube la foto del prospecto y devuélvele cómo se vería después del procedimiento."
      />
      <Simulador usadas={usadas} tope={TOPE_MENSUAL} />
    </div>
  );
}
