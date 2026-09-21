"use client";

import { useState } from "react";
import { Comparar } from "@/components/simulador/Comparar";

/**
 * El comparador que ve el paciente. Solo mira: aquí no hay nada que generar.
 * Abre en la simulación y tiene dos botones grandes para cambiar de foto: mantener
 * pulsado o arrastrar no es obvio para todos.
 */
export function Comparador({ token }: { token: string }) {
  // 100 = foto actual, 0 = simulación.
  const [vista, setVista] = useState(0);

  return (
    <div>
      <figure className="crm-flotante overflow-hidden">
        <Comparar
          actual={`/s/${token}/antes`}
          simulacion={`/s/${token}/simulacion`}
          posicion={vista}
          onPosicion={setVista}
          className="aspect-[4/5] w-full sm:aspect-[3/4]"
        />
      </figure>
      <div className="mt-4 grid grid-cols-2 gap-3" role="group" aria-label="Qué foto ver">
        {[
          { texto: "Ver foto actual", valor: 100 },
          { texto: "Ver simulación", valor: 0 },
        ].map((b) => (
          <button
            key={b.valor}
            type="button"
            aria-pressed={vista === b.valor}
            onClick={() => setVista(b.valor)}
            className={`crm-btn crm-btn-lg ${vista === b.valor ? "crm-btn-primary" : "crm-btn-secondary"}`}
          >
            {b.texto}
          </button>
        ))}
      </div>
    </div>
  );
}
