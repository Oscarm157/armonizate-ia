"use client";

import { Comparar } from "@/components/simulador/Comparar";

/** El comparador que ve el paciente. Solo mira: aquí no hay nada que generar. */
export function Comparador({ token }: { token: string }) {
  return (
    <figure className="crm-flotante overflow-hidden">
      <Comparar
        actual={`/s/${token}/antes`}
        simulacion={`/s/${token}/simulacion`}
        className="aspect-[4/5] w-full sm:aspect-[3/4]"
      />
    </figure>
  );
}
