import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isAdmin } from "@/lib/permissions";
import { listaEjecutivos } from "@/lib/datos";
import { PageHeader } from "@/components/crm/PageShell";
import { Ejecutivos } from "./Ejecutivos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ejecutivos", robots: { index: false } };

export default async function EjecutivosPage() {
  const me = await requireUser();
  if (!isAdmin(me.role)) redirect("/admin");

  const lista = await listaEjecutivos();

  return (
    <div className="crm-fade mx-auto max-w-[860px]">
      <PageHeader
        title="Ejecutivos"
        description="Los nombres que aparecen al generar una simulación. Un ejecutivo desactivado deja de aparecer, pero su historial se conserva."
      />
      <Ejecutivos lista={lista.map((e) => ({ id: e.id, nombre: e.nombre, sedes: e.sedes, activo: e.activo }))} />
    </div>
  );
}
