import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { canManageUsers } from "@/lib/permissions";
import { reportePorSede, inicioDelMes } from "@/lib/datos";
import { nombreSede } from "@/lib/sedes";
import { PageHeader } from "@/components/crm/PageShell";
import { Empty } from "@/components/states";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reporte", robots: { index: false } };

export default async function ReportePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!canManageUsers(me.role)) redirect("/admin");

  const { mes } = await searchParams;
  const desde = mes ? new Date(`${mes}-01T00:00:00`) : inicioDelMes();
  const hasta = new Date(desde.getFullYear(), desde.getMonth() + 1, 1);
  const filas = await reportePorSede(desde, hasta);

  const total = filas.reduce(
    (a, f) => ({
      simulaciones: a.simulaciones + f.simulaciones,
      prospectos: a.prospectos + f.prospectos,
      ganados: a.ganados + f.ganados,
      perdidos: a.perdidos + f.perdidos,
      sinMarcar: a.sinMarcar + f.sinMarcar,
    }),
    { simulaciones: 0, prospectos: 0, ganados: 0, perdidos: 0, sinMarcar: 0 }
  );

  const cierre = (ganados: number, perdidos: number) =>
    ganados + perdidos === 0 ? "—" : `${Math.round((ganados / (ganados + perdidos)) * 100)}%`;

  const periodo = desde.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return (
    <div className="crm-fade mx-auto max-w-[1180px]">
      <PageHeader
        eyebrow="Dirección"
        title="Ventas apoyadas por el simulador"
        description={`Por plaza, ${periodo}. Cada prospecto cuenta una sola vez, aunque tenga varias simulaciones.`}
      />

      {filas.length === 0 ? (
        <Empty title="Sin actividad en el periodo" hint="Las simulaciones del equipo aparecerán aquí desglosadas por plaza." />
      ) : (
        <div className="crm-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="crm-table min-w-[680px]">
              <thead className="crm-thead">
                <tr>
                  <th className="crm-th">Plaza</th>
                  <th className="crm-th">Simulaciones</th>
                  <th className="crm-th">Prospectos</th>
                  <th className="crm-th">Ganados</th>
                  <th className="crm-th">Perdidos</th>
                  <th className="crm-th">Sin registrar</th>
                  <th className="crm-th">Cierre</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.sede} className="crm-row">
                    <td className="crm-td font-medium text-[var(--crm-ink)]">{nombreSede(f.sede)}</td>
                    <td className="crm-td crm-num">{f.simulaciones}</td>
                    <td className="crm-td crm-num">{f.prospectos}</td>
                    <td className="crm-td crm-num font-semibold text-[var(--crm-accent)]">{f.ganados}</td>
                    <td className="crm-td crm-num">{f.perdidos}</td>
                    <td className="crm-td crm-num text-[var(--crm-ink-faint)]">{f.sinMarcar}</td>
                    <td className="crm-td crm-num">{cierre(f.ganados, f.perdidos)}</td>
                  </tr>
                ))}
                <tr className="crm-row bg-[var(--crm-surface-3)]">
                  <td className="crm-td font-semibold text-[var(--crm-ink)]">Total</td>
                  <td className="crm-td crm-num font-semibold">{total.simulaciones}</td>
                  <td className="crm-td crm-num font-semibold">{total.prospectos}</td>
                  <td className="crm-td crm-num font-semibold text-[var(--crm-accent)]">{total.ganados}</td>
                  <td className="crm-td crm-num font-semibold">{total.perdidos}</td>
                  <td className="crm-td crm-num font-semibold text-[var(--crm-ink-faint)]">{total.sinMarcar}</td>
                  <td className="crm-td crm-num font-semibold">{cierre(total.ganados, total.perdidos)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-[12.5px] text-[var(--crm-ink-mute)]">
        Cada asesor registra el resultado en su historial. Lo que está sin registrar no cuenta ni
        a favor ni en contra.
      </p>
    </div>
  );
}
