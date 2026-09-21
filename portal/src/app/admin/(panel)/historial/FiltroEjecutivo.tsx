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
    <label className="flex items-center gap-2 text-[13px] text-[var(--crm-ink-mute)]">
      Ejecutivo
      <select
        id="filtro-ejecutivo"
        className="crm-input w-auto! py-1.5!"
        value={actual}
        onChange={(e) =>
          router.push(e.target.value ? `/admin/historial?ejecutivo=${e.target.value}` : "/admin/historial")
        }
      >
        <option value="">Todos</option>
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
