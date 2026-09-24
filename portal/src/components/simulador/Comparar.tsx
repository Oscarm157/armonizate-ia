"use client";

import { useCallback, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Comparador de la fotografía actual contra la simulación.
 *
 * El tirador se ve siempre, en el centro de la imagen, y se arrastra para descubrir la
 * simulación. También se puede tocar cualquier punto de la foto para llevar el corte
 * ahí. Antes el gesto era mantener pulsado, que nadie adivinaba, y la línea desaparecía
 * en los extremos.
 *
 * Está escrito a mano y no con react-compare-slider porque la librería no deja tomar el
 * control de la posición desde fuera (los botones "Ver foto actual" / "Ver simulación").
 */
export function Comparar({
  actual,
  simulacion,
  className = "",
  posicion: controlada,
  onPosicion,
}: {
  actual: string;
  simulacion: string;
  className?: string;
  // Opcional: quien lo usa puede mover el corte desde fuera.
  posicion?: number;
  onPosicion?: (n: number) => void;
}) {
  // 100 = solo la fotografía actual. 0 = solo la simulación.
  const [interna, setInterna] = useState(50);
  const posicion = controlada ?? interna;
  const setPosicion = onPosicion ?? setInterna;
  const cajaRef = useRef<HTMLDivElement>(null);
  const arrastrando = useRef(false);

  const desdeEvento = useCallback(
    (clienteX: number) => {
      const caja = cajaRef.current?.getBoundingClientRect();
      if (!caja) return;
      setPosicion(Math.min(100, Math.max(0, ((clienteX - caja.left) / caja.width) * 100)));
    },
    [setPosicion]
  );

  const teclado = (e: React.KeyboardEvent) => {
    const paso = e.shiftKey ? 10 : 4;
    if (e.key === "ArrowLeft") setPosicion(Math.max(0, posicion - paso));
    else if (e.key === "ArrowRight") setPosicion(Math.min(100, posicion + paso));
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={cajaRef}
      className={`relative touch-none overflow-hidden select-none ${className}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        arrastrando.current = true;
        desdeEvento(e.clientX);
      }}
      onPointerMove={(e) => {
        if (arrastrando.current) desdeEvento(e.clientX);
      }}
      onPointerUp={() => (arrastrando.current = false)}
      onPointerCancel={() => (arrastrando.current = false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={actual} alt="Fotografía actual" className="h-full w-full object-contain" draggable={false} />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={simulacion}
        alt="Simulación"
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain"
        style={{ clipPath: `inset(0 0 0 ${posicion}%)` }}
      />

      {/* Etiquetas fijas: siempre se sabe qué lado es cuál. */}
      {/* La simulación se descubre desde la derecha: el corte esconde su lado izquierdo. */}
      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-[var(--crm-ink)]/75 px-2.5 py-1 text-[12px] font-medium text-white">
        Original
      </span>
      <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-[var(--crm-accent)] px-2.5 py-1 text-[12px] font-medium text-[var(--crm-on-accent)]">
        Simulación
      </span>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Deslice para comparar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(100 - posicion)}
        onKeyDown={teclado}
        className="absolute inset-y-0 w-1 -translate-x-1/2 cursor-ew-resize bg-white shadow-[0_0_6px_rgba(18,19,51,0.45)] focus-visible:outline-none"
        style={{ left: `${posicion}%` }}
      >
        {/* Abajo y no al centro: al centro la ruedita cae justo sobre las orejas. */}
        <span className="absolute left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[var(--crm-ink)] shadow-[0_2px_12px_rgba(18,19,51,0.35)]" style={{ top: "78%" }}>
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2.2}>
            <path d="M9 6 4 12l5 6M15 6l5 6-5 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
}

/**
 * Un botón que alterna de foto: 100 = foto actual, 0 = simulación.
 *
 * Es el mismo control que ve el paciente en su enlace, y por la misma razón: dos botones
 * lado a lado obligan a leer cuál está puesto antes de tocar. El texto dice lo que se va
 * a ver al tocar, no lo que se está viendo.
 */
export function BotonVista({ vista, onVista }: { vista: number; onVista: (n: number) => void }) {
  const enActual = vista === 100;
  return (
    <button
      type="button"
      aria-pressed={!enActual}
      onClick={() => onVista(enActual ? 0 : 100)}
      className="crm-btn crm-btn-secondary crm-btn-lg w-full"
    >
      <RefreshCw className="size-5" />
      {enActual ? "Ver simulación" : "Ver foto actual"}
    </button>
  );
}
