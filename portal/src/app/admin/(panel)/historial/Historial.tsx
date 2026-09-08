"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink, Link2, Maximize2, RotateCw, X } from "lucide-react";
import { Modal } from "@/components/crm/Modal";
import { fmtDate } from "@/lib/crm-format";
import { Calificar } from "@/components/simulador/Calificar";
import type { ProspectoConSimulaciones } from "@/lib/datos";
import { calificarSimulacion } from "@/app/admin/acciones-simulacion";
import { marcarResultado, reactivarEnlace } from "./acciones";

const ETIQUETA = {
  pendiente: { texto: "Sin registrar", clase: "text-[var(--crm-ink-faint)]" },
  ganado: { texto: "Ganado", clase: "text-[var(--crm-accent)]" },
  perdido: { texto: "Perdido", clase: "text-[var(--crm-danger)]" },
} as const;

export function Historial({ prospectos }: { prospectos: ProspectoConSimulaciones[] }) {
  const [abierto, setAbierto] = useState<{ id: string; correo: string } | null>(null);

  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {prospectos.map((p) => (
          <Tarjeta key={p.correo} prospecto={p} onAbrir={setAbierto} />
        ))}
      </ul>

      <Modal open={!!abierto} onClose={() => setAbierto(null)} title={abierto?.correo} maxWidth={900}>
        {abierto && (
          <div className="grid gap-3 sm:grid-cols-2">
            {(["antes", "despues"] as const).map((cual) => (
              <figure key={cual}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/admin/simulaciones/${abierto.id}/${cual}`}
                  alt={cual === "antes" ? "Actual" : "Simulación"}
                  className="w-full rounded-[var(--crm-r-img)] object-contain"
                />
                <figcaption className="mt-2 text-center text-[12px] text-[var(--crm-ink-mute)]">
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
  onAbrir: (v: { id: string; correo: string }) => void;
}) {
  const [resultado, setResultado] = useState(prospecto.resultado);
  const [pendiente, iniciar] = useTransition();
  const [copiado, setCopiado] = useState(false);
  const ultima = prospecto.simulaciones[0];
  const et = ETIQUETA[resultado];
  const vigente = !!ultima.expiraEn && new Date(ultima.expiraEn) > new Date();

  const marcar = (valor: "ganado" | "perdido") => {
    const nuevo = resultado === valor ? "pendiente" : valor;
    setResultado(nuevo);
    iniciar(async () => {
      const r = await marcarResultado(prospecto.correo, nuevo);
      if (r?.error) setResultado(prospecto.resultado);
    });
  };

  const copiarEnlace = async () => {
    if (!ultima.token) return;
    await navigator.clipboard.writeText(`${location.origin}/s/${ultima.token}`);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <li className="overflow-hidden rounded-[var(--crm-r-lg)] bg-[var(--crm-surface)]">
      <button
        type="button"
        onClick={() => onAbrir({ id: ultima.id, correo: prospecto.correo })}
        className="group relative block w-full"
        aria-label={`Abrir el caso de ${prospecto.correo}`}
      >
        <span className="grid grid-cols-2 gap-px bg-[var(--crm-surface-3)]">
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

      <div className="px-4 py-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[13.5px] font-medium text-[var(--crm-ink)]">{prospecto.correo}</p>
          <span className={`shrink-0 text-[11.5px] ${et.clase}`}>{et.texto}</span>
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--crm-ink-mute)]">
          <span className="crm-num">{fmtDate(ultima.creadoEn)}</span>
          {prospecto.asesor && <span className="truncate">· {prospecto.asesor}</span>}
        </p>

        {prospecto.vambe && (
          <a
            href={prospecto.vambe}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-[var(--crm-accent)] hover:underline"
          >
            <ExternalLink className="size-3.5" /> Ver en Vambe
          </a>
        )}

        {/* El enlace es lo que se le manda al paciente, y caduca a las 24 horas. */}
        {ultima.token && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={copiarEnlace}
              disabled={!vigente}
              className="crm-btn crm-btn-secondary crm-btn-sm flex-1 justify-center"
            >
              <Link2 className="size-3.5" /> {copiado ? "Copiado" : "Copiar enlace"}
            </button>
            {!vigente && (
              <button
                onClick={() =>
                  iniciar(async () => {
                    await reactivarEnlace(ultima.id);
                  })
                }
                disabled={pendiente}
                className="crm-btn crm-btn-secondary crm-btn-sm justify-center"
                title="El enlace caducó: reactivarlo por otras 24 horas"
              >
                <RotateCw className="size-3.5" /> Reactivar
              </button>
            )}
          </div>
        )}

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
