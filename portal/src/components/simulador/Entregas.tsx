"use client";

import { useState } from "react";
import { Download, Maximize2 } from "lucide-react";
import { Modal } from "@/components/crm/Modal";

export type Entrega = { clave: string; titulo: string; pie: string; dataUrl: string };

/**
 * Las dos imágenes tal como se van a mandar, con su logo y su aviso ya impresos.
 *
 * Están aquí para que el vendedor vea la entrega sin tener que descargarla primero,
 * que era la única forma de saber cómo había quedado.
 */
export function Entregas({
  entregas,
  onDescargar,
}: {
  entregas: Entrega[];
  onDescargar: (clave: string) => void;
}) {
  const [abierta, setAbierta] = useState<Entrega | null>(null);

  return (
    <>
      <div>
        <p className="crm-eyebrow mb-3">Material para el paciente</p>
        <div className="grid gap-3">
          {entregas.map((e) => (
            <div
              key={e.clave}
              className="overflow-hidden rounded-[var(--crm-r-md)] bg-[var(--crm-surface-3)]"
            >
              <button
                type="button"
                onClick={() => setAbierta(e)}
                aria-label={`Abrir ${e.titulo}`}
                className="group relative block w-full bg-[var(--crm-surface-3)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.dataUrl} alt={e.titulo} className="max-h-40 w-full object-contain" />
                <span className="absolute inset-0 grid place-items-center bg-[var(--crm-ink)]/0 transition-colors group-hover:bg-[var(--crm-ink)]/25">
                  <Maximize2 className="size-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
              </button>
              <div className="px-3.5 py-3">
                <p className="text-[13.5px] font-semibold text-[var(--crm-ink)]">{e.titulo}</p>
                <p className="mt-0.5 text-[12px] text-[var(--crm-ink-mute)]">{e.pie}</p>
                <button
                  onClick={() => onDescargar(e.clave)}
                  className="crm-btn crm-btn-secondary crm-btn-sm mt-3 w-full justify-center"
                >
                  <Download className="size-3.5" /> Descargar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={!!abierta} onClose={() => setAbierta(null)} title={abierta?.titulo} maxWidth={980}>
        {abierta && (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={abierta.dataUrl}
              alt={abierta.titulo}
              className="max-h-[70dvh] w-full rounded-[var(--crm-r-img)] object-contain"
            />
            <button
              onClick={() => onDescargar(abierta.clave)}
              className="crm-btn crm-btn-primary mt-4 w-full justify-center"
            >
              <Download className="size-4" /> Descargar
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}
