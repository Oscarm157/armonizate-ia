"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ImageUp, Sparkles } from "lucide-react";
import { cargarImagen, detectar } from "@/lib/simulador/landmarks";
import { cajaCabeza } from "@/lib/simulador/geometria";
import { componer } from "@/lib/simulador/componer";
import { aDataUrl, precargarLogo, reducir } from "@/lib/simulador/entrega";

type Foto = { url: string; img: HTMLImageElement };

/**
 * Carga un caso de validación: la fotografía inicial y el resultado real de la clínica.
 *
 * El modelo solo recibe la inicial. El resultado real se guarda aparte y nunca entra a
 * la generación; si entrara, la comparación no mediría nada.
 */
export function NuevoCaso() {
  const router = useRouter();
  const [antes, setAntes] = useState<Foto | null>(null);
  const [real, setReal] = useState<Foto | null>(null);
  const [etiqueta, setEtiqueta] = useState("");
  const [corriendo, setCorriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    precargarLogo();
  }, []);

  const cargar = useCallback(async (file: File, destino: (f: Foto | null) => void) => {
    setError(null);
    const url = URL.createObjectURL(file);
    try {
      const img = await cargarImagen(url);
      destino({ url: aDataUrl(reducir(img)), img });
    } catch {
      setError("No fue posible abrir la fotografía.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  const correr = async () => {
    if (!antes || !real) return;
    setCorriendo(true);
    setError(null);
    try {
      const pts = await detectar(antes.img);
      if (!pts) throw new Error("No se detecta un rostro de frente en la fotografía inicial.");

      const caja = cajaCabeza(pts, antes.img.naturalWidth, antes.img.naturalHeight);
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 1024;
      c.getContext("2d")!.drawImage(antes.img, caja.x, caja.y, caja.lado, caja.lado, 0, 0, 1024, 1024);

      const res = await fetch("/api/validacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabeza: c.toDataURL("image/jpeg", 0.95),
          antes: antes.url,
          real: real.url,
          etiqueta: etiqueta.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? `No se pudo generar (${res.status}).`);

      const generada = await cargarImagen(data.imagen);
      const compuesta = await componer(antes.img, generada);
      if (!compuesta) throw new Error("No se pudo ajustar el resultado sobre la fotografía inicial.");

      await fetch(`/api/validacion/${data.id}/resultado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen: compuesta.toDataURL("image/jpeg", 0.9) }),
      });

      setAntes(null);
      setReal(null);
      setEtiqueta("");
      formRef.current?.reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el caso.");
    } finally {
      setCorriendo(false);
    }
  };

  return (
    <form ref={formRef} className="crm-mesa p-6 sm:p-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_280px] lg:gap-8">
        <Campo
          titulo="Fotografía inicial"
          pie="Es la única que ve el modelo"
          foto={antes}
          onArchivo={(f) => cargar(f, setAntes)}
        />
        <Campo
          titulo="Resultado real"
          pie="El después que entregó la clínica"
          foto={real}
          onArchivo={(f) => cargar(f, setReal)}
        />
        <div className="flex flex-col justify-end gap-3">
          <label htmlFor="etiqueta" className="text-[13px] text-[var(--crm-ink-mute)]">
            Referencia del caso
          </label>
          <input
            id="etiqueta"
            className="crm-input"
            placeholder="Otomodelación 43"
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            disabled={corriendo}
          />
          <button
            type="button"
            onClick={correr}
            disabled={!antes || !real || corriendo}
            className="crm-btn crm-btn-primary w-full justify-center"
          >
            <Sparkles className={`size-4 ${corriendo ? "animate-pulse" : ""}`} />
            {corriendo ? "Generando…" : "Generar y comparar"}
          </button>
        </div>
      </div>

      {error && (
        <p
          className="mt-5 flex items-start gap-2 rounded-[var(--crm-r-sm)] bg-[var(--crm-danger)]/8 px-3 py-2.5 text-[13px] text-[var(--crm-ink)]"
          role="alert"
        >
          <AlertCircle className="mt-px size-4 shrink-0 text-[var(--crm-danger)]" />
          {error}
        </p>
      )}
    </form>
  );
}

function Campo({
  titulo,
  pie,
  foto,
  onArchivo,
}: {
  titulo: string;
  pie: string;
  foto: Foto | null;
  onArchivo: (f: File) => void;
}) {
  return (
    <div>
      <p className="text-[13.5px] text-[var(--crm-ink)]">{titulo}</p>
      <p className="mt-0.5 mb-2.5 text-[12px] text-[var(--crm-ink-faint)]">{pie}</p>
      <label className="group block aspect-[4/5] max-h-[240px] w-full cursor-pointer overflow-hidden rounded-[var(--crm-r-md)] bg-[var(--crm-surface-3)]">
        {foto ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={foto.url} alt={titulo} className="h-full w-full object-contain" />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--crm-ink-faint)] transition-colors group-hover:text-[var(--crm-accent)]">
            <ImageUp className="size-6" strokeWidth={1.5} />
            <span className="text-[12.5px]">Elegir imagen</span>
          </span>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onArchivo(f);
          }}
        />
      </label>
    </div>
  );
}
