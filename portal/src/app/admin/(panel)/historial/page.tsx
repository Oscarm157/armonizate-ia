import Link from "next/link";
import { requireUser } from "@/lib/session";
import { canVerTodo } from "@/lib/permissions";
import { misProspectos, consumoDelMes, TOPE_MENSUAL } from "@/lib/datos";
import { PageHeader } from "@/components/crm/PageShell";
import { KeyFacts } from "@/components/crm/KeyFacts";
import { Empty } from "@/components/states";
import { Historial } from "./Historial";

export const dynamic = "force-dynamic";
export const metadata = { title: "Historial", robots: { index: false } };

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ equipo?: string }>;
}) {
  const me = await requireUser();
  const { equipo } = await searchParams;
  // Ver el trabajo del equipo requiere el rol, no solo el parámetro en la dirección.
  const todoElEquipo = equipo === "1" && canVerTodo(me.role);

  const [prospectos, usadas] = await Promise.all([
    misProspectos(me.id, { todoElEquipo }),
    consumoDelMes(me.id),
  ]);

  const ganados = prospectos.filter((p) => p.resultado === "ganado").length;
  const sinRegistrar = prospectos.filter((p) => p.resultado === "pendiente").length;

  return (
    <div className="crm-fade mx-auto max-w-[1200px]">
      <PageHeader
        eyebrow="Herramienta"
        title="Historial"
        description="Registre cuáles prospectos cerraron para medir si la herramienta está apoyando la venta."
        actions={
          canVerTodo(me.role) ? (
            <div className="flex gap-1.5">
              {[
                { texto: "Míos", activo: !todoElEquipo, href: "/admin/historial" },
                { texto: "Todo el equipo", activo: todoElEquipo, href: "/admin/historial?equipo=1" },
              ].map((o) => (
                <Link
                  key={o.href}
                  href={o.href}
                  className={`crm-btn crm-btn-sm ${o.activo ? "crm-btn-primary" : "crm-btn-secondary"}`}
                >
                  {o.texto}
                </Link>
              ))}
            </div>
          ) : null
        }
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
          title="Aún no hay simulaciones"
          hint="Las simulaciones que genere aparecerán en este listado."
        />
      ) : (
        <Historial prospectos={prospectos} />
      )}
    </div>
  );
}
