import { requireUser } from "@/lib/session";
import { misSimulaciones, consumoDelMes, TOPE_MENSUAL } from "@/lib/datos";
import { fmtDate } from "@/lib/crm-format";
import { PageHeader } from "@/components/crm/PageShell";
import { KeyFacts } from "@/components/crm/KeyFacts";
import { Empty } from "@/components/states";

export const dynamic = "force-dynamic";
export const metadata = { title: "Historial", robots: { index: false } };

export default async function HistorialPage() {
  const me = await requireUser();
  const [filas, usadas] = await Promise.all([misSimulaciones(me.id), consumoDelMes(me.id)]);

  return (
    <div className="crm-fade mx-auto max-w-[1180px]">
      <PageHeader
        eyebrow="Herramienta"
        title="Historial"
        description="Las simulaciones que has generado, de la más reciente a la más antigua."
      />

      <div className="mb-5">
        <KeyFacts
          items={[
            { label: "Este mes", value: <span className="crm-num">{usadas} / {TOPE_MENSUAL}</span> },
            { label: "En total", value: <span className="crm-num">{filas.length}</span> },
          ]}
        />
      </div>

      {filas.length === 0 ? (
        <Empty
          title="Todavía no has generado ninguna simulación"
          hint="Ve al simulador, sube la foto de un prospecto y aparecerá aquí."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filas.map((s) => (
            <li
              key={s.id}
              className="overflow-hidden rounded-[var(--crm-r-lg)] border border-[var(--crm-line)] bg-[var(--crm-surface)]"
            >
              <div className="grid grid-cols-2 gap-px bg-[var(--crm-line)]">
                {(["antes", "despues"] as const).map((cual) => (
                  <div key={cual} className="relative aspect-[3/4] bg-[var(--crm-surface-3)]">
                    {cual === "despues" && !s.despuesUrl ? (
                      <span className="grid h-full place-items-center px-2 text-center text-[11.5px] text-[var(--crm-ink-faint)]">
                        No se completó
                      </span>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`/admin/simulaciones/${s.id}/${cual}`}
                        alt={cual === "antes" ? "Antes" : "Después"}
                        className="h-full w-full object-cover"
                      />
                    )}
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[var(--crm-ink)]/70 px-2 py-0.5 text-[10.5px] font-medium text-white">
                      {cual === "antes" ? "Antes" : "Después"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-3.5 py-3">
                <p className="truncate text-[13.5px] font-semibold text-[var(--crm-ink)]">
                  {s.prospectoNombre}
                </p>
                <p className="mt-0.5 flex items-center justify-between gap-2 text-[12px] text-[var(--crm-ink-mute)]">
                  <span className="crm-num truncate">{s.prospectoTelefono}</span>
                  <span className="crm-num shrink-0">{fmtDate(s.creadoEn)}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
