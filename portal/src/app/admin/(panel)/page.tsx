import { requireUser } from "@/lib/session";
import { consumoDelMes, listaEjecutivos, TOPE_MENSUAL } from "@/lib/datos";
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
      {/* Encabezado compacto: dentro del panel de la clínica el marco mide ~660 px de
          alto y el espacio se lo lleva el flujo, no el título. */}
      <div className="mb-5 flex items-end justify-between gap-4">
        <h1 className="text-[24px] font-medium text-[var(--crm-ink)]">Simulador de otomodelación</h1>
        {/* La cuota es de todo el equipo: el acceso es compartido y el tope también. */}
        <p className="text-right text-[14px] text-[var(--crm-ink-mute)]">
          <span className={`crm-num text-[20px] ${poco ? "text-[var(--crm-danger)]" : "text-[var(--crm-ink)]"}`}>
            {usadas} de {TOPE_MENSUAL}
          </span>{" "}
          simulaciones usadas este mes
        </p>
      </div>
      <Simulador
        usadas={usadas}
        tope={TOPE_MENSUAL}
        ejecutivos={ejecutivos.map((e) => ({ id: e.id, nombre: e.nombre, sedes: e.sedes }))}
      />
    </div>
  );
}
