import { requireUser } from "@/lib/session";
import { misProspectos, consumoDelMes, TOPE_MENSUAL } from "@/lib/datos";
import { PageHeader } from "@/components/crm/PageShell";
import { KeyFacts } from "@/components/crm/KeyFacts";
import { Empty } from "@/components/states";
import { Historial } from "./Historial";

export const dynamic = "force-dynamic";
export const metadata = { title: "Historial", robots: { index: false } };

export default async function HistorialPage() {
  const me = await requireUser();
  const [prospectos, usadas] = await Promise.all([misProspectos(me.id), consumoDelMes(me.id)]);

  const ganados = prospectos.filter((p) => p.resultado === "ganado").length;
  const sinMarcar = prospectos.filter((p) => p.resultado === "pendiente").length;

  return (
    <div className="crm-fade mx-auto max-w-[1180px]">
      <PageHeader
        eyebrow="Herramienta"
        title="Historial"
        description="Tus prospectos. Marca cuáles cerraron para saber si la herramienta está ayudando a vender."
      />

      <div className="mb-5">
        <KeyFacts
          items={[
            { label: "Este mes", value: <span className="crm-num">{usadas} / {TOPE_MENSUAL}</span> },
            { label: "Prospectos", value: <span className="crm-num">{prospectos.length}</span> },
            { label: "Ganados", value: <span className="crm-num">{ganados}</span> },
            { label: "Sin marcar", value: <span className="crm-num">{sinMarcar}</span> },
          ]}
        />
      </div>

      {prospectos.length === 0 ? (
        <Empty
          title="Todavía no has generado ninguna simulación"
          hint="Ve al simulador, sube la foto de un prospecto y aparecerá aquí."
        />
      ) : (
        <Historial prospectos={prospectos} />
      )}
    </div>
  );
}
