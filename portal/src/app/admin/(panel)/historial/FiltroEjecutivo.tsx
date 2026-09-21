"use client";

import { useRouter } from "next/navigation";
import { SIN_EJECUTIVO } from "@/lib/ejecutivos";

export function FiltroEjecutivo({
  ejecutivos,
  actual,
}: {
  ejecutivos: { id: string; nombre: string }[];
  actual: string;
}) {
  const router = useRouter();
  return (
    <label className="flex flex-wrap items-center gap-2 text-[16px] font-medium text-[var(--crm-ink)]">
      Ver simulaciones de:
      <select
        id="filtro-ejecutivo"
        className="crm-input w-auto! min-w-[220px] text-[16px]!"
        value={actual}
        onChange={(e) =>
          router.push(e.target.value ? `/admin/historial?ejecutivo=${e.target.value}` : "/admin/historial")
        }
      >
        <option value="">Todos los ejecutivos</option>
        {ejecutivos.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre}
          </option>
        ))}
        <option value="ninguno">{SIN_EJECUTIVO}</option>
      </select>
    </label>
  );
}
