"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Link2, Maximize2, RotateCw, X } from "lucide-react";
import { Modal } from "@/components/crm/Modal";
import { fmtDate } from "@/lib/crm-format";
import { Calificar } from "@/components/simulador/Calificar";
import type { ProspectoConSimulaciones } from "@/lib/datos";
import { calificarSimulacion } from "@/app/admin/acciones-simulacion";
import { marcarResultado, reactivarEnlace } from "./acciones";

const ETIQUETA = {
  pendiente: { texto: "sin registrar", clase: "text-[var(--crm-ink-mute)]" },
  ganado: { texto: "vendido", clase: "text-[var(--crm-accent)]" },
  perdido: { texto: "no vendido", clase: "text-[var(--crm-danger)]" },
} as const;

export function Historial({ prospectos }: { prospectos: ProspectoConSimulaciones[] }) {
  const [abierto, setAbierto] = useState<{ id: string; correo: string } | null>(null);

  return (
    <>
      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
  const [folioCopiado, setFolioCopiado] = useState(false);
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

  const copiarFolio = async () => {
    await navigator.clipboard.writeText(ultima.id);
    setFolioCopiado(true);
    setTimeout(() => setFolioCopiado(false), 2000);
  };

  return (
    <li className="overflow-hidden rounded-[var(--crm-r-lg)] bg-[var(--crm-surface)]">
      <div className="px-5 pt-4 pb-3">
        <p className="truncate text-[17px] font-medium text-[var(--crm-ink)]">{prospecto.correo}</p>
        <p className="mt-0.5 text-[15px] text-[var(--crm-ink-mute)]">
          <span className="crm-num">{fmtDate(ultima.creadoEn)}</span> · {prospecto.asesor}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onAbrir({ id: ultima.id, correo: prospecto.correo })}
        className="block w-full"
        aria-label={`Ver en grande el caso de ${prospecto.correo}`}
      >
        <span className="grid grid-cols-2 gap-px bg-[var(--crm-surface-3)]">
          {(["antes", "despues"] as const).map((cual) => (
            <span key={cual} className="relative block aspect-[3/4] bg-[var(--crm-surface-3)]">
              {cual === "despues" && !ultima.despuesUrl ? (
                <span className="grid h-full place-items-center px-2 text-center text-[14px] text-[var(--crm-ink-mute)]">
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
              <span className="absolute bottom-2 left-2 rounded-md bg-[var(--crm-ink)]/75 px-2 py-0.5 text-[13px] text-white">
                {cual === "antes" ? "Actual" : "Simulación"}
              </span>
            </span>
          ))}
        </span>
        <span className="flex min-h-11 items-center justify-center gap-2 text-[15px] text-[var(--crm-accent)] underline underline-offset-4">
          <Maximize2 className="size-4" /> Ver en grande
        </span>
      </button>

      <div className="space-y-4 px-5 pt-2 pb-5">
        {/* El enlace es lo que se le manda al paciente, y caduca a las 24 horas. Vencido,
            el único botón es el que lo revive: nada que adivinar. */}
        {ultima.token &&
          (vigente ? (
            <div>
              <button onClick={copiarEnlace} className="crm-btn crm-btn-primary crm-btn-lg w-full">
                {copiado ? <Check className="size-5" /> : <Link2 className="size-5" />}
                {copiado ? "Enlace copiado" : "Copiar enlace para el paciente"}
              </button>
              {copiado && (
                <p className="mt-2 text-[15px] text-[var(--crm-ink)]">Péguelo en el WhatsApp del paciente.</p>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-2 text-[15px] text-[var(--crm-ink)]">El enlace venció.</p>
              <button
                onClick={() =>
                  iniciar(async () => {
                    await reactivarEnlace(ultima.id);
                  })
                }
                disabled={pendiente}
                className="crm-btn crm-btn-secondary crm-btn-lg w-full"
              >
                <RotateCw className="size-5" /> Reactivar el enlace 24 horas
              </button>
            </div>
          ))}

        <div>
          <p className="mb-2 text-[16px] font-medium text-[var(--crm-ink)]">
            ¿Se hizo la venta?{" "}
            <span className={`text-[15px] font-normal ${et.clase}`}>({et.texto})</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => marcar("ganado")}
              disabled={pendiente}
              aria-pressed={resultado === "ganado"}
              className={`crm-btn crm-btn-lg ${resultado === "ganado" ? "crm-btn-primary" : "crm-btn-secondary"}`}
            >
              <Check className="size-5" /> Sí, se vendió
            </button>
            <button
              onClick={() => marcar("perdido")}
              disabled={pendiente}
              aria-pressed={resultado === "perdido"}
              className="crm-btn crm-btn-secondary crm-btn-lg"
              style={
                resultado === "perdido"
                  ? { background: "var(--crm-danger)", borderColor: "var(--crm-danger)", color: "#fff" }
                  : undefined
              }
            >
              <X className="size-5" /> No se vendió
            </button>
          </div>
        </div>

        <Calificar
          valor={ultima.calificacion}
          etiqueta="Calidad de la simulación"
          onCalificar={(n) => calificarSimulacion(ultima.id, n)}
        />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[14px]">
          {prospecto.vambe && (
            <a
              href={prospecto.vambe}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 text-[var(--crm-accent)] underline underline-offset-4"
            >
              <ExternalLink className="size-4" /> Abrir en Vambe
            </a>
          )}
          {/* El folio identifica la generación cuando hay que hablar de una en concreto. */}
          <button
            onClick={copiarFolio}
            className="inline-flex min-h-10 items-center gap-1.5 text-[var(--crm-ink-mute)] underline underline-offset-4"
          >
            <Copy className="size-4" /> {folioCopiado ? "Folio copiado" : "Copiar folio"}
          </button>
        </div>
      </div>
    </li>
  );
}
