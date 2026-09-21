import { requireUser } from "@/lib/session";
import { consumoDelMes, listaEjecutivos, TOPE_MENSUAL } from "@/lib/datos";
import { PageHeader } from "@/components/crm/PageShell";
import { Simulador } from "@/components/simulador/Simulador";

export const dynamic = "force-dynamic";
export const metadata = { title: "Simulador", robots: { index: false } };

export default async function SimuladorPage() {
  await requireUser();
  const [usadas, ejecutivos] = await Promise.all([
    consumoDelMes(),
    listaEjecutivos({ soloActivos: true }),
  ]);
  const poco = usadas >= TOPE_MENSUAL * 0.9;

  return (
    <div className="crm-fade mx-auto max-w-[1180px]">
      <PageHeader
        title="Simulador de otomodelación"
        actions={
          // La cuota es de todo el equipo: el acceso es compartido y el tope también.
          <span className="text-right">
            <span
              className={`crm-num block text-[22px] font-light leading-none ${
                poco ? "text-[var(--crm-danger)]" : "text-[var(--crm-ink)]"
              }`}
            >
              {usadas}
              <span className="text-[var(--crm-ink-faint)]"> / {TOPE_MENSUAL}</span>
            </span>
            <span className="crm-eyebrow mt-1.5 block">Simulaciones del mes</span>
          </span>
        }
      />
      <Simulador
        usadas={usadas}
        tope={TOPE_MENSUAL}
        ejecutivos={ejecutivos.map((e) => ({ id: e.id, nombre: e.nombre }))}
      />
    </div>
  );
}
