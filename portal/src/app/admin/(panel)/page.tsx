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

  return (
    // 85%: dentro de ArmoAdmin el marco es chico y así entra más flujo sin bajar. La
    // escala se aplica a toda la pantalla para que nada quede desproporcionado.
    <div className="crm-fade mx-auto max-w-[1180px] [zoom:0.85]">
      {/* Encabezado compacto: dentro del panel de la clínica el marco mide ~660 px de
          alto y el espacio se lo lleva el flujo, no el título. El consumo no se enseña
          aquí: al terminar se le dice al ejecutivo cuántas lleva él. */}
      <h1 className="mb-5 text-[24px] font-medium text-[var(--crm-ink)]">Simulador de Otomodelación</h1>
      <Simulador
        usadas={usadas}
        tope={TOPE_MENSUAL}
        ejecutivos={ejecutivos.map((e) => ({ id: e.id, nombre: e.nombre, sedes: e.sedes }))}
      />
    </div>
  );
}
