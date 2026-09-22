"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Comparar } from "@/components/simulador/Comparar";

/**
 * El comparador que ve el paciente. Solo mira: aquí no hay nada que generar.
 * Abre en la simulación y un solo botón cambia entre las dos fotos: mantener pulsado o
 * arrastrar no es obvio para todos, y dos botones separados se leían como un menú.
 */
export function Comparador({ token }: { token: string }) {
  // 100 = foto actual, 0 = simulación.
  const [vista, setVista] = useState(0);
  const enActual = vista === 100;

  return (
    <div>
      {/* En escritorio el alto manda: la foto cabe con el botón sin bajar. */}
      <figure className="crm-flotante mx-auto max-w-[min(100%,calc(50dvh*0.8))] bg-[var(--crm-surface-3)] overflow-hidden">
        <Comparar
          actual={`/s/${token}/antes`}
          simulacion={`/s/${token}/simulacion`}
          posicion={vista}
          onPosicion={setVista}
          className="aspect-[4/5] w-full"
        />
      </figure>
      {/* El texto dice lo que se va a ver al tocar, no lo que se ve ahora. */}
      {/* Centrado con un contenedor: .crm-btn es inline-flex y no se centra con mx-auto. */}
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          aria-pressed={enActual}
          onClick={() => setVista(enActual ? 0 : 100)}
          // Secundario: el principal de la página es el de WhatsApp.
          className="crm-btn crm-btn-secondary crm-btn-lg w-full max-w-[min(100%,calc(50dvh*0.8))] border-[var(--crm-accent)] text-[var(--crm-accent)]"
        >
          <RefreshCw className="size-5" />
          {enActual ? "Ver simulación" : "Ver foto actual"}
        </button>
      </div>
    </div>
  );
}
