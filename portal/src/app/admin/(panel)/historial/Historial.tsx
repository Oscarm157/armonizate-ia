"use client";

import { useState, useTransition } from "react";
import { Check, Maximize2, X } from "lucide-react";
import { Modal } from "@/components/crm/Modal";
import { fmtDate } from "@/lib/crm-format";
import type { ProspectoConSimulaciones } from "@/lib/datos";
import { marcarResultado } from "./acciones";
import { calificarSimulacion } from "@/app/admin/acciones-simulacion";
import { Calificar } from "@/components/simulador/Calificar";

const ETIQUETA = {
  pendiente: { texto: "Sin registrar", clase: "text-[var(--crm-ink-faint)]" },
  ganado: { texto: "Ganado", clase: "text-[var(--crm-accent)]" },
  perdido: { texto: "Perdido", clase: "text-[var(--crm-danger)]" },
} as const;

export function Historial({ prospectos }: { prospectos: ProspectoConSimulaciones[] }) {
  const [abierto, setAbierto] = useState<{ id: string; telefono: string } | null>(null);

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {prospectos.map((p) => (
          <Tarjeta key={p.telefono} prospecto={p} onAbrir={setAbierto} />
        ))}
      </ul>

      <Modal
        open={!!abierto}
        onClose={() => setAbierto(null)}
        title={abierto ? abierto.telefono : undefined}
        maxWidth={900}
      >
        {abierto && (
          <div className="grid gap-2 sm:grid-cols-2">
            {(["antes", "despues"] as const).map((cual) => (
              <figure key={cual}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/admin/simulaciones/${abierto.id}/${cual}`}
                  alt={cual === "antes" ? "Actual" : "Simulación"}
                  className="w-full rounded-[var(--crm-r-img)] object-contain"
                />
                <figcaption className="mt-1.5 text-center text-[12px] text-[var(--crm-ink-mute)]">
                  {cual === "antes" ? "Actual" : "Simulación"}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

function Tarjeta({
  prospecto,
  onAbrir,
}: {
  prospecto: ProspectoConSimulaciones;
  onAbrir: (v: { id: string; telefono: string }) => void;
}) {
  const [resultado, setResultado] = useState(prospecto.resultado);
  const [pendiente, iniciar] = useTransition();
  const ultima = prospecto.simulaciones[0];
  const et = ETIQUETA[resultado];

  const marcar = (valor: "ganado" | "perdido") => {
    const nuevo = resultado === valor ? "pendiente" : valor;
    setResultado(nuevo);
    iniciar(async () => {
      const r = await marcarResultado(prospecto.telefono, nuevo);
      if (r?.error) setResultado(prospecto.resultado);
    });
  };

  return (
    <li className="crm-card overflow-hidden">
      <button
        type="button"
        onClick={() => onAbrir({ id: ultima.id, telefono: prospecto.telefono })}
        className="group relative block w-full"
        aria-label={`Abrir el caso de ${prospecto.telefono}`}
      >
        <span className="grid grid-cols-2 gap-px bg-[var(--crm-line)]">
          {(["antes", "despues"] as const).map((cual) => (
            <span key={cual} className="relative block aspect-[3/4] bg-[var(--crm-surface-3)]">
              {cual === "despues" && !ultima.despuesUrl ? (
                <span className="grid h-full place-items-center px-2 text-center text-[11.5px] text-[var(--crm-ink-faint)]">
                  Sin completar
                </span>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`/admin/simulaciones/${ultima.id}/${cual}`}
                  alt={cual === "antes" ? "Actual" : "Simulación"}
                  className="h-full w-full object-contain"
                />
              )}
            </span>
          ))}
        </span>
        <span className="absolute inset-0 grid place-items-center bg-[var(--crm-ink)]/0 transition-colors group-hover:bg-[var(--crm-ink)]/25">
          <Maximize2 className="size-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
      </button>

      <div className="px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="crm-num truncate text-[13.5px] font-semibold text-[var(--crm-ink)]">
            {prospecto.telefono}
          </p>
          <span className={`text-[11.5px] font-medium ${et.clase}`}>{et.texto}</span>
        </div>
        <p className="crm-num mt-0.5 text-[12px] text-[var(--crm-ink-mute)]">
          {fmtDate(ultima.creadoEn)}
          {prospecto.simulaciones.length > 1 && ` · ${prospecto.simulaciones.length} simulaciones`}
        </p>

        <div className="mt-3">
          <Calificar
            valor={ultima.calificacion}
            etiqueta="Calidad"
            onCalificar={(n) => calificarSimulacion(ultima.id, n)}
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => marcar("ganado")}
            disabled={pendiente}
            aria-pressed={resultado === "ganado"}
            className={`crm-btn crm-btn-sm flex-1 justify-center ${
              resultado === "ganado" ? "crm-btn-primary" : "crm-btn-secondary"
            }`}
          >
            <Check className="size-3.5" /> Ganado
          </button>
          <button
            onClick={() => marcar("perdido")}
            disabled={pendiente}
            aria-pressed={resultado === "perdido"}
            className="crm-btn crm-btn-secondary crm-btn-sm flex-1 justify-center"
            style={
              resultado === "perdido"
                ? { borderColor: "var(--crm-danger)", color: "var(--crm-danger)" }
                : undefined
            }
          >
            <X className="size-3.5" /> Perdido
          </button>
        </div>
      </div>
    </li>
  );
}
