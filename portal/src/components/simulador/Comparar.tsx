"use client";

import { useCallback, useRef, useState } from "react";

/** Dónde se apoya el tirador, en porcentaje de la altura. */
const ALTURA_TIRADOR = 82;

/**
 * Comparador de la fotografía actual contra la simulación.
 *
 * Dos gestos, y cada uno resuelve algo distinto:
 *
 * - Arrastrar el tirador compara poco a poco. El tirador va abajo y no al centro
 *   porque en el centro cae justo sobre la cara y tapa lo que se está comparando.
 * - Mantener pulsado sobre la imagen enseña la simulación completa, y al soltar vuelve
 *   la fotografía actual. Es el gesto que de verdad se usa enseñándole el resultado a
 *   un paciente: el ojo compara mucho mejor con un cambio limpio que con una línea
 *   que parte la cara.
 *
 * Está escrito a mano y no con react-compare-slider porque la librería no deja mover el
 * tirador de sitio ni tomar el control de la posición desde fuera.
 */
export function Comparar({
  actual,
  simulacion,
  className = "",
}: {
  actual: string;
  simulacion: string;
  className?: string;
}) {
  // 100 = solo la fotografía actual. 0 = solo la simulación.
  const [posicion, setPosicion] = useState(50);
  const [pulsando, setPulsando] = useState(false);
  const cajaRef = useRef<HTMLDivElement>(null);
  const arrastrando = useRef(false);

  const desdeEvento = useCallback((clienteX: number) => {
    const caja = cajaRef.current?.getBoundingClientRect();
    if (!caja) return;
    setPosicion(Math.min(100, Math.max(0, ((clienteX - caja.left) / caja.width) * 100)));
  }, []);

  const soltar = useCallback(() => {
    if (!arrastrando.current) setPosicion(100);
    arrastrando.current = false;
    setPulsando(false);
  }, []);

  return (
    <div
      ref={cajaRef}
      className={`relative touch-none overflow-hidden select-none ${className}`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setPulsando(true);
        setPosicion(0);
      }}
      onPointerMove={(e) => {
        if (!pulsando) return;
        arrastrando.current = true;
        desdeEvento(e.clientX);
      }}
      onPointerUp={soltar}
      onPointerCancel={soltar}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={actual} alt="Fotografía actual" className="h-full w-full object-contain" draggable={false} />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={simulacion}
        alt="Simulación"
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain"
        style={{
          clipPath: `inset(0 0 0 ${posicion}%)`,
          transition: pulsando ? "none" : "clip-path 180ms ease-out",
        }}
      />

      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-white/85"
        style={{
          left: `${posicion}%`,
          opacity: pulsando ? 0 : 1,
          transition: pulsando ? "none" : "left 180ms ease-out, opacity 180ms ease-out",
        }}
      >
        <span
          className="absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[var(--crm-ink)] shadow-[0_2px_10px_rgba(18,19,51,0.25)]"
          style={{ top: `${ALTURA_TIRADOR}%` }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 6 4 12l5 6M15 6l5 6-5 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      {/* Cada etiqueta solo aparece cuando esa mitad está a la vista: dejar "Simulación"
          puesta sobre la fotografía actual dice lo contrario de lo que se está viendo. */}
      {posicion > 3 && (
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[var(--crm-ink)]/70 px-2.5 py-1 text-[11px] text-white">
          Actual
        </span>
      )}
      {posicion < 97 && (
        <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-[var(--crm-accent)] px-2.5 py-1 text-[11px] text-[var(--crm-on-accent)]">
          Simulación
        </span>
      )}
    </div>
  );
}
