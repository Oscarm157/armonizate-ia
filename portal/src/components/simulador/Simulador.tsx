"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, Download, ImageUp, RotateCcw, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { cargarImagen, detectar } from "@/lib/simulador/landmarks";
import { cajaCabeza } from "@/lib/simulador/geometria";
import { componer } from "@/lib/simulador/componer";
import { aDataUrl, antesYDespues, descargar, reducir, soloDespues } from "@/lib/simulador/entrega";

type Estado = "vacio" | "listo" | "generando" | "hecho" | "error";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];

export function Simulador({ usadas, tope }: { usadas: number; tope: number }) {
  const [estado, setEstado] = useState<Estado>("vacio");
  const [error, setError] = useState<string | null>(null);
  const [consumo, setConsumo] = useState(usadas);
  const [original, setOriginal] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const finalRef = useRef<{ despues: HTMLCanvasElement; antes: HTMLImageElement } | null>(null);

  const agotado = consumo >= tope;

  const cargar = useCallback(async (file: File) => {
    setError(null);
    if (!TIPOS.includes(file.type)) {
      setError("Usa una foto JPG, PNG o WebP.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await cargarImagen(url);
      const pts = await detectar(img);
      if (!pts) {
        setError("No se ve una cara de frente. Pídele una foto de frente, con el pelo recogido.");
        setEstado("error");
        return;
      }
      setOriginal(aDataUrl(reducir(img)));
      setResultado(null);
      setEstado("listo");
    } catch {
      setError("No se pudo abrir esa foto.");
      setEstado("error");
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  const generar = useCallback(async () => {
    if (!original) return;
    setEstado("generando");
    setError(null);
    try {
      const img = await cargarImagen(original);
      const pts = await detectar(img);
      if (!pts) throw new Error("No se ve una cara de frente en la foto.");

      // Recorte de la cabeza: el modelo necesita píxeles de oreja para trabajar.
      const caja = cajaCabeza(pts, img.naturalWidth, img.naturalHeight);
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 1024;
      c.getContext("2d")!.drawImage(img, caja.x, caja.y, caja.lado, caja.lado, 0, 0, 1024, 1024);

      const res = await fetch("/api/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabeza: c.toDataURL("image/jpeg", 0.95),
          original,
          prospectoNombre: nombre,
          prospectoTelefono: telefono,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo generar la simulación.");

      const generada = await cargarImagen(data.imagen);
      const compuesta = await componer(img, generada);
      if (!compuesta) throw new Error("No se pudo ajustar el resultado sobre la foto original.");

      finalRef.current = { despues: compuesta, antes: img };
      setResultado(compuesta.toDataURL("image/jpeg", 0.92));
      setConsumo(data.usadas ?? consumo + 1);
      setEstado("hecho");

      // Guardar el resultado no debe bloquear al vendedor: si falla, la imagen ya está.
      fetch(`/api/simulaciones/${data.id}/resultado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen: compuesta.toDataURL("image/jpeg", 0.9) }),
      }).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar la simulación.");
      setEstado("error");
    }
  }, [original, nombre, telefono, consumo]);

  const reiniciar = () => {
    setEstado("vacio");
    setOriginal(null);
    setResultado(null);
    setError(null);
    setNombre("");
    setTelefono("");
    finalRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

  const bajar = (cual: "despues" | "ambas") => {
    const f = finalRef.current;
    if (!f) return;
    const base = nombre.trim().toLowerCase().replace(/\s+/g, "-") || "paciente";
    if (cual === "despues") descargar(soloDespues(f.despues), `${base}-despues.jpg`);
    else descargar(antesYDespues(f.antes, f.despues), `${base}-antes-y-despues.jpg`);
  };

  const datosListos = nombre.trim().length >= 2 && telefono.trim().length >= 7;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
      {/* Lienzo */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[var(--crm-r-xl)] border border-[var(--crm-line)] bg-[var(--crm-surface-3)]">
        {estado === "vacio" && (
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) cargar(f);
            }}
            className="crm-dropzone flex h-full w-full cursor-pointer flex-col items-center justify-center gap-4 px-8 text-center"
          >
            <span className="grid size-16 place-items-center rounded-full bg-[var(--crm-accent)] text-[var(--crm-on-accent)]">
              <ImageUp className="size-7" strokeWidth={1.75} />
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-[var(--crm-ink)]">
                Sube la foto del prospecto
              </span>
              <span className="mt-1 block text-[13px] text-[var(--crm-ink-mute)]">
                De frente, con el pelo recogido y las orejas descubiertas
              </span>
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) cargar(f);
              }}
            />
          </label>
        )}

        {estado !== "vacio" && (original || resultado) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resultado ?? original ?? ""}
            alt={resultado ? "Simulación" : "Foto del prospecto"}
            className="h-full w-full object-cover"
          />
        )}

        {estado === "generando" && (
          <div className="absolute inset-0 grid place-items-center bg-[var(--crm-ink)]/35">
            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-full bg-[var(--crm-surface)] px-4 py-2 text-[13px] font-medium text-[var(--crm-ink)]"
            >
              Generando la simulación…
            </motion.span>
          </div>
        )}

        {estado === "hecho" && (
          <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[var(--crm-accent)] px-3 py-1 text-[11.5px] font-semibold text-[var(--crm-on-accent)]">
            Simulación
          </span>
        )}
      </div>

      {/* Control */}
      <div>
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <h2 className="crm-h2">Nueva simulación</h2>
          <span className={`crm-num text-[12.5px] ${agotado ? "text-[var(--crm-danger)]" : "text-[var(--crm-ink-mute)]"}`}>
            {consumo} / {tope} este mes
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="crm-eyebrow mb-1.5 block" htmlFor="nombre">Prospecto</label>
            <input
              id="nombre"
              className="crm-input"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={estado === "generando"}
            />
          </div>
          <div>
            <label className="crm-eyebrow mb-1.5 block" htmlFor="telefono">Teléfono</label>
            <input
              id="telefono"
              className="crm-input"
              inputMode="tel"
              placeholder="10 dígitos"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              disabled={estado === "generando"}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-[var(--crm-r-md)] border border-[var(--crm-danger)]/35 bg-[var(--crm-danger)]/8 px-3 py-2.5 text-[13px] text-[var(--crm-ink)]" role="alert">
            <AlertCircle className="mt-px size-4 shrink-0 text-[var(--crm-danger)]" />
            {error}
          </p>
        )}

        {agotado && !error && (
          <p className="mt-4 rounded-[var(--crm-r-md)] border border-[var(--crm-danger)]/35 bg-[var(--crm-danger)]/8 px-3 py-2.5 text-[13px] text-[var(--crm-ink)]">
            Llegaste a tu tope de {tope} simulaciones este mes. Se reinicia el día 1.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          {(estado === "listo" || estado === "error") && original && (
            <button
              onClick={generar}
              disabled={!datosListos || agotado}
              className="crm-btn crm-btn-primary w-full justify-center sm:w-auto"
            >
              <Sparkles className="size-4" /> Generar simulación
            </button>
          )}

          {estado === "generando" && (
            <button disabled className="crm-btn crm-btn-primary w-full justify-center sm:w-auto">
              <Sparkles className="size-4 animate-pulse" /> Generando…
            </button>
          )}

          {estado === "hecho" && (
            <>
              <button onClick={() => bajar("despues")} className="crm-btn crm-btn-primary w-full justify-center sm:w-auto">
                <Download className="size-4" /> Descargar el después
              </button>
              <button onClick={() => bajar("ambas")} className="crm-btn crm-btn-secondary w-full justify-center sm:w-auto">
                <Download className="size-4" /> Antes y después
              </button>
              <button onClick={generar} disabled={agotado} className="crm-btn crm-btn-ghost w-full justify-center sm:w-auto">
                <RotateCcw className="size-4" /> Repetir
              </button>
            </>
          )}

          {estado !== "vacio" && (
            <button onClick={reiniciar} className="crm-btn crm-btn-ghost w-full justify-center sm:w-auto">
              Otra foto
            </button>
          )}
        </div>

        {!datosListos && (estado === "listo" || estado === "error") && (
          <p className="mt-3 text-[12.5px] text-[var(--crm-ink-mute)]">
            Captura el nombre y el teléfono del prospecto para generar.
          </p>
        )}

        <p className="mt-6 border-t border-[var(--crm-line)] pt-4 text-[12.5px] leading-relaxed text-[var(--crm-ink-mute)]">
          Las dos imágenes se descargan con el aviso impreso de que son una previsualización
          y de que el resultado final puede variar.
        </p>
      </div>
    </div>
  );
}
