import { requireUser } from "@/lib/session";
import { historial, consumoDelMes, listaEjecutivos, TOPE_MENSUAL } from "@/lib/datos";
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
  const me = await requireUser();
  const { ejecutivo = "" } = await searchParams;

  const [lista, usadas] = await Promise.all([listaEjecutivos(), consumoDelMes(me.id)]);
  // El filtro viene de la dirección: solo se aplica si es un ejecutivo que existe.
  const filtro = ejecutivo === "ninguno" || lista.some((e) => e.id === ejecutivo) ? ejecutivo : "";
  const prospectos = await historial({ ejecutivo: filtro || undefined });

  const ganados = prospectos.filter((p) => p.resultado === "ganado").length;
  const sinRegistrar = prospectos.filter((p) => p.resultado === "pendiente").length;

  return (
    <div className="crm-fade mx-auto max-w-[1200px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-medium text-[var(--crm-ink)]">Historial</h1>
          <p className="mt-1 text-[15px] text-[var(--crm-ink-mute)]">
            Marca en cada paciente el estado del ticket.
          </p>
        </div>
        <FiltroEjecutivo ejecutivos={lista} actual={filtro} />
      </div>

      <div className="mb-6">
        <KeyFacts
          items={[
            { label: "Este mes", value: <span className="crm-num">{usadas} / {TOPE_MENSUAL}</span> },
            { label: "Prospectos", value: <span className="crm-num">{prospectos.length}</span> },
            { label: "Tickets ganados", value: <span className="crm-num">{ganados}</span> },
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
