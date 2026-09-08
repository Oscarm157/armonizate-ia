"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, ImageUp, RotateCcw, Sparkles } from "lucide-react";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";
import { cargarImagen, detectar } from "@/lib/simulador/landmarks";
import { cajaCabeza } from "@/lib/simulador/geometria";
import { componer } from "@/lib/simulador/componer";
import {
  aDataUrl, antesYDespues, descargar, precargarLogo, reducir, soloDespues,
} from "@/lib/simulador/entrega";
import { Entregas, type Entrega } from "./Entregas";

type Estado = "vacio" | "listo" | "generando" | "hecho" | "error";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];

const GUIA = [
  "De frente, mirando a la cámara",
  "Con el pelo recogido, orejas descubiertas",
  "Buena luz, sin sombras duras en la cara",
  "Sin lentes ni gorra",
];

export function Simulador({ usadas, tope }: { usadas: number; tope: number }) {
  const [estado, setEstado] = useState<Estado>("vacio");
  const [error, setError] = useState<string | null>(null);
  const [consumo, setConsumo] = useState(usadas);
  const [original, setOriginal] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [telefono, setTelefono] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const finalRef = useRef<{ despues: HTMLCanvasElement; antes: HTMLImageElement } | null>(null);

  // El logo va impreso en las imágenes; se trae mientras el vendedor captura la foto.
  useEffect(() => {
    precargarLogo();
  }, []);

  const agotado = consumo >= tope;
  const soloDigitos = telefono.replace(/\D/g, "");
  const datosListos = soloDigitos.length >= 10;

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
        setError("No se ve una cara de frente. Pídele otra foto, de frente y con el pelo recogido.");
        setEstado("error");
        return;
      }
      setOriginal(aDataUrl(reducir(img)));
      setResultado(null);
      setEntregas([]);
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
          prospectoTelefono: telefono,
        }),
      });
      // Si el servidor truena antes de responder, el cuerpo viene vacío: leerlo como
      // JSON a ciegas tapa el error real con uno de parseo.
      const data = await res.json().catch(() => null);
      if (!res.ok || !data)
        throw new Error(data?.error ?? `No se pudo generar la simulación (${res.status}).`);

      const generada = await cargarImagen(data.imagen);
      const compuesta = await componer(img, generada);
      if (!compuesta) throw new Error("No se pudo ajustar el resultado sobre la foto original.");

      finalRef.current = { despues: compuesta, antes: img };
      setResultado(compuesta.toDataURL("image/jpeg", 0.92));
      setEntregas([
        {
          clave: "despues",
          titulo: "Solo el después",
          pie: "Para mandarle su resultado",
          dataUrl: aDataUrl(soloDespues(compuesta), 0.85),
        },
        {
          clave: "ambas",
          titulo: "Antes y después",
          pie: "Para que vea el contraste",
          dataUrl: aDataUrl(antesYDespues(img, compuesta), 0.85),
        },
      ]);
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
  }, [original, telefono, consumo]);

  const reiniciar = () => {
    setEstado("vacio");
    setOriginal(null);
    setResultado(null);
    setEntregas([]);
    setError(null);
    setTelefono("");
    finalRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

  const bajar = (clave: string) => {
    const f = finalRef.current;
    if (!f) return;
    const base = soloDigitos || "paciente";
    if (clave === "despues") descargar(soloDespues(f.despues), `${base}-despues.jpg`);
    else descargar(antesYDespues(f.antes, f.despues), `${base}-antes-y-despues.jpg`);
  };

  const paso = !original ? 1 : !datosListos ? 2 : estado === "hecho" ? 3 : 2;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div>
        {/* Lienzo acotado en alto: si ocupa toda la pantalla, el campo del celular y
            el botón quedan bajo el pliegue y hay que ir a buscarlos. */}
        <div className="relative mx-auto aspect-[4/5] max-h-[42dvh] w-full overflow-hidden rounded-[var(--crm-r-xl)] border border-[var(--crm-line)] bg-[var(--crm-surface-3)] lg:max-h-[540px]">
          {!original && (
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) cargar(f);
              }}
              className="crm-dropzone flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 px-6 text-center"
            >
              <span className="grid size-14 place-items-center rounded-full bg-[var(--crm-accent)] text-[var(--crm-on-accent)]">
                <ImageUp className="size-6" strokeWidth={1.75} />
              </span>
              <span className="text-[15px] font-semibold text-[var(--crm-ink)]">
                Sube la foto del prospecto
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

          {/* El contraste es lo que vende: antes solo se veía bajando la imagen. */}
          {estado === "hecho" && original && resultado && (
            <>
              <ReactCompareSlider
                className="h-full w-full"
                itemOne={<ReactCompareSliderImage src={original} alt="Antes" style={{ objectFit: "cover" }} />}
                itemTwo={<ReactCompareSliderImage src={resultado} alt="Después" style={{ objectFit: "cover" }} />}
              />
              <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[var(--crm-ink)]/70 px-2.5 py-1 text-[11px] font-medium text-white">
                Antes
              </span>
              <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-[var(--crm-accent)] px-2.5 py-1 text-[11px] font-medium text-[var(--crm-on-accent)]">
                Después
              </span>
            </>
          )}

          {estado !== "hecho" && original && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={original} alt="Foto del prospecto" className="h-full w-full object-cover" />
          )}

          {estado === "generando" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--crm-ink)]/40">
              <span className="rounded-full bg-[var(--crm-surface)] px-4 py-2 text-[13px] font-medium text-[var(--crm-ink)]">
                Generando la simulación
              </span>
              <span className="text-[12px] text-white/85">Toma unos 15 segundos</span>
            </div>
          )}
        </div>

        {estado === "hecho" && (
          <p className="mt-2 text-center text-[12.5px] text-[var(--crm-ink-mute)]">
            Arrastra el control para comparar
          </p>
        )}

        {entregas.length > 0 && <Entregas entregas={entregas} onDescargar={bajar} />}
      </div>

      {/* Control */}
      <div className="lg:sticky lg:top-20">
        <div className="mb-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="crm-h2">Nueva simulación</h2>
            <span
              className={`crm-num text-[12.5px] ${agotado ? "text-[var(--crm-danger)]" : "text-[var(--crm-ink-mute)]"}`}
            >
              {consumo} / {tope}
            </span>
          </div>
          <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-[var(--crm-surface-3)]">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.min(100, (consumo / tope) * 100)}%`,
                background: agotado ? "var(--crm-danger)" : "var(--crm-accent)",
              }}
            />
          </span>
          <p className="mt-1.5 text-[11.5px] text-[var(--crm-ink-faint)]">
            Simulaciones usadas este mes. Se reinicia el día 1.
          </p>
        </div>

        <ol className="space-y-3.5">
          <Paso n={1} activo={paso === 1} hecho={!!original} texto="Foto del prospecto">
            {!original && (
              <ul className="mt-2 space-y-1">
                {GUIA.map((g) => (
                  <li key={g} className="flex gap-1.5 text-[12.5px] text-[var(--crm-ink-mute)]">
                    <span className="text-[var(--crm-accent)]">·</span>
                    {g}
                  </li>
                ))}
              </ul>
            )}
          </Paso>

          <Paso n={2} activo={paso === 2} hecho={datosListos} texto="Celular del prospecto">
            <input
              id="telefono"
              className="crm-input mt-2"
              inputMode="tel"
              placeholder="10 dígitos"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              disabled={estado === "generando"}
            />
          </Paso>

          <Paso n={3} activo={paso === 3} hecho={estado === "hecho"} texto="Generar y mandar" />
        </ol>

        {error && (
          <p
            className="mt-4 flex items-start gap-2 rounded-[var(--crm-r-md)] border border-[var(--crm-danger)]/35 bg-[var(--crm-danger)]/8 px-3 py-2.5 text-[13px] text-[var(--crm-ink)]"
            role="alert"
          >
            <AlertCircle className="mt-px size-4 shrink-0 text-[var(--crm-danger)]" />
            {error}
          </p>
        )}

        {agotado && !error && (
          <p className="mt-4 rounded-[var(--crm-r-md)] border border-[var(--crm-danger)]/35 bg-[var(--crm-danger)]/8 px-3 py-2.5 text-[13px] text-[var(--crm-ink)]">
            Llegaste a tu tope de {tope} simulaciones este mes. Se reinicia el día 1.
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2.5">
          {estado !== "generando" && estado !== "hecho" && original && (
            <button
              onClick={generar}
              disabled={!datosListos || agotado}
              className="crm-btn crm-btn-primary w-full justify-center"
            >
              <Sparkles className="size-4" /> Generar simulación
            </button>
          )}

          {estado === "generando" && (
            <button disabled className="crm-btn crm-btn-primary w-full justify-center">
              <Sparkles className="size-4 animate-pulse" /> Generando…
            </button>
          )}

          {estado === "hecho" && (
            <button
              onClick={generar}
              disabled={agotado}
              className="crm-btn crm-btn-secondary w-full justify-center"
            >
              <RotateCcw className="size-4" /> Repetir la simulación
            </button>
          )}

          {original && (
            <button onClick={reiniciar} className="crm-btn crm-btn-ghost w-full justify-center">
              Empezar con otra foto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Paso({
  n, activo, hecho, texto, children,
}: {
  n: number;
  activo: boolean;
  hecho: boolean;
  texto: string;
  children?: React.ReactNode;
}) {
  return (
    <li className={activo || hecho ? "" : "opacity-45"}>
      <div className="flex items-center gap-2">
        <span
          className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
            hecho
              ? "bg-[var(--crm-accent)] text-[var(--crm-on-accent)]"
              : "border border-[var(--crm-line-strong)] text-[var(--crm-ink-mute)]"
          }`}
        >
          {hecho ? <Check className="size-3" strokeWidth={3} /> : n}
        </span>
        <span className="text-[13.5px] font-medium text-[var(--crm-ink)]">{texto}</span>
      </div>
      {children ? <div className="pl-7">{children}</div> : null}
    </li>
  );
}
