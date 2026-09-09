"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { PRECIO_LISTA, fmtPesos, precioConDescuento } from "@/lib/promo";

const FINAL = precioConDescuento();

function reloj(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${dos(Math.floor(s / 3600))}:${dos(Math.floor((s % 3600) / 60))}:${dos(s % 60)}`;
}

/**
 * El plazo del enlace, y la promoción cuando el asesor decidió incluirla.
 *
 * El servidor manda los milisegundos que faltan, no la hora de vencimiento: a partir de
 * ahí solo se miden diferencias con el reloj local, así que un teléfono con la hora mal
 * puesta no enseña un plazo equivocado. La primera pintura sale de ese número, que viaja
 * como prop, y por eso servidor y cliente pintan lo mismo.
 */
export function Plazo({ restanteMs, codigo }: { restanteMs: number; codigo: string | null }) {
  const [restante, setRestante] = useState(restanteMs);
  const [copiado, setCopiado] = useState(false);
  const precioRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const fin = Date.now() + restanteMs;
    // Cada tick recalcula contra `fin` en vez de restar un segundo: si el navegador
    // frena el temporizador con la pestaña de fondo, al volver el número es el correcto.
    const leer = () => setRestante(Math.max(0, fin - Date.now()));
    const t = setInterval(leer, 1000);
    document.addEventListener("visibilitychange", leer);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", leer);
    };
  }, [restanteMs]);

  // El precio baja del de lista al de la promoción al entrar. Se escribe directo en el
  // nodo, sin estado, para no re-renderizar el bloque sesenta veces por segundo.
  useEffect(() => {
    const nodo = precioRef.current;
    if (!nodo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodo.textContent = fmtPesos(FINAL);
      return;
    }
    const DURACION = 1200;
    const arranque = performance.now();
    let frame = 0;
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - arranque) / DURACION);
      const suave = 1 - Math.pow(1 - t, 3);
      nodo.textContent = fmtPesos(Math.round(PRECIO_LISTA + (FINAL - PRECIO_LISTA) * suave));
      if (t < 1) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, []);

  const copiar = async () => {
    if (!codigo) return;
    await navigator.clipboard.writeText(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  if (restante <= 0) {
    return (
      <div className="mt-8 rounded-[var(--crm-r-lg)] border border-[var(--crm-line)] bg-[var(--crm-surface)] px-6 py-7 text-center">
        <p className="text-[15px] text-[var(--crm-ink)]">El plazo de esta simulación terminó.</p>
        <p className="mt-2 text-[13.5px] text-[var(--crm-ink-mute)]">
          Escriba a su asesor para que le abra el enlace de nuevo.
        </p>
      </div>
    );
  }

  // Sin promoción el contador se queda, pero contando lo único cierto que hay que
  // contar: lo que le falta al enlace para cerrarse. Anunciar aquí una oferta que el
  // asesor decidió no dar sería vender algo que no existe.
  if (!codigo) {
    return (
      <section className="mt-8 rounded-[var(--crm-r-lg)] border border-[var(--crm-line)] bg-[var(--crm-surface)] px-6 py-7 text-center">
        <p className="crm-eyebrow">Su simulación está disponible por</p>
        <p className="crm-num mt-2 text-[36px] leading-none font-light tabular-nums text-[var(--crm-accent-strong)] sm:text-[44px]">
          {reloj(restante)}
        </p>
        <p className="mx-auto mt-4 max-w-[44ch] text-[13.5px] leading-relaxed text-[var(--crm-ink-mute)]">
          Pasado ese plazo el enlace deja de abrirse. Escriba a su asesor si necesita más
          tiempo o quiere resolver dudas del procedimiento.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 overflow-hidden rounded-[var(--crm-r-lg)] bg-[var(--crm-accent)] px-6 py-8 text-center text-[var(--crm-on-accent)] sm:px-10 sm:py-10">
      <p className="text-[11.5px] tracking-[0.14em] text-[var(--crm-on-accent)]/70 uppercase">
        Su descuento termina en
      </p>
      <p className="crm-num mt-2 text-[40px] leading-none font-light tabular-nums sm:text-[52px]">
        {reloj(restante)}
      </p>

      <p className="crm-num mt-8 text-[16px] text-[var(--crm-on-accent)]/55 line-through">
        {fmtPesos(PRECIO_LISTA)}
      </p>
      <p
        ref={precioRef}
        className="crm-num mt-1 text-[52px] leading-none font-semibold tabular-nums sm:text-[68px]"
      >
        {fmtPesos(FINAL)}
      </p>
      <p className="mt-3 text-[13.5px] text-[var(--crm-on-accent)]/80">
        10% de descuento sobre el total del procedimiento
      </p>

      <div className="mx-auto mt-7 flex max-w-[380px] flex-col gap-2.5">
        <p className="crm-num rounded-[var(--crm-r-sm)] bg-white/12 px-4 py-3 text-[19px] tracking-[0.12em]">
          {codigo}
        </p>
        <button
          onClick={copiar}
          className="crm-btn w-full justify-center bg-white text-[var(--crm-accent)] hover:bg-white/90"
        >
          {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copiado ? "Código copiado" : "Copiar código"}
        </button>
      </div>

      <p className="mx-auto mt-5 max-w-[46ch] text-[12px] leading-relaxed text-[var(--crm-on-accent)]/65">
        Presente este código en la clínica. Válido únicamente durante el tiempo que marca
        el contador.
      </p>
    </section>
  );
}
