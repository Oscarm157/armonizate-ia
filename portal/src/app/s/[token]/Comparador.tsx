"use client";

import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";

/** El comparador que ve el paciente. Solo mira: aquí no hay nada que generar. */
export function Comparador({ token }: { token: string }) {
  return (
    <figure className="crm-flotante relative overflow-hidden">
      <ReactCompareSlider
        className="aspect-[4/5] w-full sm:aspect-[3/4]"
        itemOne={
          <ReactCompareSliderImage
            src={`/s/${token}/antes`}
            alt="Su fotografía"
            style={{ objectFit: "contain" }}
          />
        }
        itemTwo={
          <ReactCompareSliderImage
            src={`/s/${token}/simulacion`}
            alt="Simulación"
            style={{ objectFit: "contain" }}
          />
        }
      />
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-3 pb-3">
        <span className="rounded-full bg-[var(--crm-ink)]/70 px-2.5 py-1 text-[11px] text-white">
          Actual
        </span>
        <span className="rounded-full bg-[var(--crm-accent)] px-2.5 py-1 text-[11px] text-white">
          Simulación
        </span>
      </figcaption>
    </figure>
  );
}
