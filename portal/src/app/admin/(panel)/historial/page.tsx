import { requireUser } from "@/lib/session";
import { historial, consumoDelMes, listaEjecutivos, TOPE_MENSUAL } from "@/lib/datos";
import { PageHeader } from "@/components/crm/PageShell";
import { KeyFacts } from "@/components/crm/KeyFacts";
import { Empty } from "@/components/states";
import { Historial } from "./Historial";
import { FiltroEjecutivo } from "./FiltroEjecutivo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Historial", robots: { index: false } };

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ ejecutivo?: string }>;
}) {
  await requireUser();
  const { ejecutivo = "" } = await searchParams;

  const [lista, usadas] = await Promise.all([listaEjecutivos(), consumoDelMes()]);
  // El filtro viene de la dirección: solo se aplica si es un ejecutivo que existe.
  const filtro = ejecutivo === "ninguno" || lista.some((e) => e.id === ejecutivo) ? ejecutivo : "";
  const prospectos = await historial({ ejecutivo: filtro || undefined });

  const ganados = prospectos.filter((p) => p.resultado === "ganado").length;
  const sinRegistrar = prospectos.filter((p) => p.resultado === "pendiente").length;

  return (
    <div className="crm-fade mx-auto max-w-[1200px]">
      <PageHeader
        title="Historial"
        description="Registre cuáles prospectos cerraron para medir si la herramienta está apoyando la venta."
        actions={<FiltroEjecutivo ejecutivos={lista} actual={filtro} />}
      />

      <div className="mb-6">
        <KeyFacts
          items={[
            { label: "Este mes", value: <span className="crm-num">{usadas} / {TOPE_MENSUAL}</span> },
            { label: "Prospectos", value: <span className="crm-num">{prospectos.length}</span> },
            { label: "Ganados", value: <span className="crm-num">{ganados}</span> },
            { label: "Sin registrar", value: <span className="crm-num">{sinRegistrar}</span> },
          ]}
        />
      </div>

      {prospectos.length === 0 ? (
        <Empty
          title="Sin simulaciones"
          hint={filtro ? "Este ejecutivo aún no tiene simulaciones." : "Las simulaciones que se generen aparecerán en este listado."}
        />
      ) : (
        <Historial prospectos={prospectos} />
      )}
    </div>
  );
}
