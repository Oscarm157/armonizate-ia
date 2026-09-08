import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { validaciones } from "@/lib/schema";
import { requireAdmin } from "@/lib/session";
import { PageHeader } from "@/components/crm/PageShell";
import { KeyFacts } from "@/components/crm/KeyFacts";
import { Empty } from "@/components/states";
import { NuevoCaso } from "./NuevoCaso";
import { Casos } from "./Casos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Validación", robots: { index: false } };

export default async function ValidacionPage() {
  await requireAdmin();

  const casos = await db.select().from(validaciones).orderBy(desc(validaciones.creadoEn));
  const calificados = casos.filter((c) => c.calificacion !== null);
  const promedio = calificados.length
    ? (calificados.reduce((s, c) => s + (c.calificacion ?? 0), 0) / calificados.length).toFixed(1)
    : "—";

  return (
    <div className="crm-fade mx-auto max-w-[1200px]">
      <PageHeader
        eyebrow="Interno"
        title="Validación"
        description="Casos con resultado real de la clínica, para comparar la simulación contra lo que se entrega. Estos casos no se le muestran a ningún paciente."
      />

      <div className="mb-6">
        <KeyFacts
          items={[
            { label: "Casos", value: <span className="crm-num">{casos.length}</span> },
            { label: "Calificados", value: <span className="crm-num">{calificados.length}</span> },
            { label: "Parecido promedio", value: <span className="crm-num">{promedio}</span> },
          ]}
        />
      </div>

      <div className="mb-8">
        <NuevoCaso />
      </div>

      {casos.length === 0 ? (
        <Empty
          title="Aún no hay casos cargados"
          hint="Cargue una fotografía inicial y su resultado real para comparar los tres juntos."
        />
      ) : (
        <Casos casos={casos} />
      )}
    </div>
  );
}
