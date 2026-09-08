"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";

/**
 * Calificación de 1 a 5 de una simulación.
 *
 * Mide la generación, no al asesor: es lo que después dice si el modelo mejoró al
 * cambiar el prompt. Siempre opcional, porque el asesor la usa con el paciente
 * esperando y un campo obligatorio ahí solo produce datos inventados.
 */
export function Calificar({
  valor,
  onCalificar,
  etiqueta = "Calidad de esta simulación",
}: {
  valor: number | null;
  onCalificar: (n: number) => Promise<{ error?: string } | void>;
  etiqueta?: string;
}) {
  const [actual, setActual] = useState(valor);
  const [sobre, setSobre] = useState<number | null>(null);
  const [pendiente, iniciar] = useTransition();

  const marcar = (n: number) => {
    const previo = actual;
    setActual(n);
    iniciar(async () => {
      const r = await onCalificar(n);
      if (r && "error" in r && r.error) setActual(previo);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="text-[13px] text-[var(--crm-ink-mute)]">{etiqueta}</span>
      <span className="flex items-center gap-0.5" role="group" aria-label={etiqueta}>
        {[1, 2, 3, 4, 5].map((n) => {
          const encendida = (sobre ?? actual ?? 0) >= n;
          return (
            <button
              key={n}
              type="button"
              disabled={pendiente}
              onClick={() => marcar(n)}
              onMouseEnter={() => setSobre(n)}
              onMouseLeave={() => setSobre(null)}
              aria-label={`${n} de 5`}
              aria-pressed={actual === n}
              className="p-0.5 transition-transform hover:scale-110 disabled:pointer-events-none"
            >
              <Star
                className={`size-5 ${encendida ? "text-[var(--crm-accent)]" : "text-[var(--crm-line-strong)]"}`}
                fill={encendida ? "currentColor" : "none"}
                strokeWidth={1.75}
              />
            </button>
          );
        })}
      </span>
    </div>
  );
}
