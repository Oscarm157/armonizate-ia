"use client";

import { useState } from "react";
import { BotonesVista, Comparar } from "@/components/simulador/Comparar";

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
          className="aspect-[4/5] w-full"
        />
      </figure>
      <div className="mt-4">
        <BotonesVista vista={vista} onVista={setVista} />
      </div>
    </div>
  );
}
