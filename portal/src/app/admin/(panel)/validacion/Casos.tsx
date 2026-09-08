"use client";

import { fmtDate } from "@/lib/crm-format";
import { Calificar } from "@/components/simulador/Calificar";
import type { Validacion } from "@/lib/schema";
import { calificarValidacion } from "./acciones";

const COLUMNAS = [
  { cual: "antes", titulo: "Inicial" },
  { cual: "simulada", titulo: "Simulación" },
  { cual: "real", titulo: "Resultado real" },
] as const;

/**
 * Los tres estados de cada caso, en el mismo orden siempre: inicial, simulación y
 * resultado real. La simulación va en medio a propósito, para leer de un vistazo si se
 * quedó corta o se pasó respecto de lo que la clínica entrega.
 */
export function Casos({ casos }: { casos: Validacion[] }) {
  return (
    <ul className="space-y-6">
      {casos.map((c) => (
        <li key={c.id} className="crm-mesa p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-[14.5px] text-[var(--crm-ink)]">
              {c.etiqueta ?? "Caso sin referencia"}
              {/* Los casos anteriores al grado no lo tienen: se generaron con un prompt
                  único, y ponerles uno ahora sería inventarlo. */}
              <span className="ml-2 text-[12.5px] text-[var(--crm-ink-mute)]">
                {c.grado ? `Grado ${c.grado}` : "Sin grado"}
              </span>
            </p>
            <p className="crm-num text-[12px] text-[var(--crm-ink-faint)]">{fmtDate(c.creadoEn)}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {COLUMNAS.map((col) => (
              <figure key={col.cual}>
                <div className="aspect-[4/5] overflow-hidden rounded-[var(--crm-r-md)] bg-[var(--crm-surface-3)]">
                  {col.cual === "simulada" && !c.simuladaPathname ? (
                    <span className="grid h-full place-items-center px-3 text-center text-[12px] text-[var(--crm-ink-faint)]">
                      Sin completar
                    </span>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`/admin/validaciones/${c.id}/${col.cual}`}
                      alt={col.titulo}
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
                <figcaption className="mt-2 text-center text-[12px] text-[var(--crm-ink-mute)]">
                  {col.titulo}
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-4">
            <Calificar
              valor={c.calificacion}
              etiqueta="Parecido con el resultado real"
              onCalificar={(n) => calificarValidacion(c.id, n)}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
