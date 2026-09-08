import { requireUser } from "@/lib/session";
import { consumoDelMes, TOPE_MENSUAL } from "@/lib/datos";
import { nombreSede } from "@/lib/sedes";
import { PageHeader } from "@/components/crm/PageShell";
import { Simulador } from "@/components/simulador/Simulador";

export const dynamic = "force-dynamic";
export const metadata = { title: "Simulador", robots: { index: false } };

export default async function SimuladorPage() {
  const me = await requireUser();
  const usadas = await consumoDelMes(me.id);
  const poco = usadas >= TOPE_MENSUAL * 0.9;

  return (
    <div className="crm-fade mx-auto max-w-[1180px]">
      <PageHeader
        eyebrow={nombreSede(me.sede)}
        title="Simulador de otomodelación"
        description="Cargue la fotografía del paciente y obtenga la simulación del procedimiento."
        actions={
          // La cuota vive aquí y no junto al formulario: ahí se leía como el avance de
          // la simulación en curso. Es información de la cuenta, no del trabajo.
          <span
            className={`crm-num text-[13px] ${poco ? "text-[var(--crm-danger)]" : "text-[var(--crm-ink-mute)]"}`}
          >
            {usadas} de {TOPE_MENSUAL} este mes
          </span>
        }
      />
      <Simulador usadas={usadas} tope={TOPE_MENSUAL} />
    </div>
  );
}
