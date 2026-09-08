"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, ImageUp, Link2, RotateCcw, Sparkles } from "lucide-react";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";
import { cargarImagen, detectar } from "@/lib/simulador/landmarks";
import { cajaCabeza } from "@/lib/simulador/geometria";
import { componer } from "@/lib/simulador/componer";
import {
  aDataUrl, actualYSimulacion, descargar, precargarLogo, reducir, soloSimulacion,
} from "@/lib/simulador/entrega";
import { HORAS_VIGENCIA } from "@/lib/enlace";
import { GRADOS, type Grado } from "@/lib/simulador/grado";
import { LEGAL_CUERPO, LEGAL_TITULO } from "@/lib/legal";
import { Entregas, type Entrega } from "./Entregas";
import { Calificar } from "./Calificar";
import { calificarSimulacion } from "@/app/admin/acciones-simulacion";

type Estado = "vacio" | "listo" | "generando" | "hecho" | "error";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];

const GUIA = [
  "De frente, mirando a la cámara",
  "Con el pelo recogido, orejas descubiertas",
  "Buena luz, sin sombras marcadas en el rostro",
  "Sin lentes ni gorra",
];

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Simulador({ usadas, tope }: { usadas: number; tope: number }) {
  const [estado, setEstado] = useState<Estado>("vacio");
  const [error, setError] = useState<string | null>(null);
  const [consumo, setConsumo] = useState(usadas);
  const [original, setOriginal] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [grado, setGrado] = useState<Grado | null>(null);
  const [correo, setCorreo] = useState("");
  const [vambe, setVambe] = useState("");
  const [simulacionId, setSimulacionId] = useState<string | null>(null);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [repeticiones, setRepeticiones] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // La foto tal como la subió el vendedor, sin reducir ni recomprimir. Es sobre esta
  // que se compone: usar la versión reducida (la que se sube por el límite de la
  // petición) hacía que la entrega saliera a la resolución de entrada y no a la del
  // modelo, que genera en 2K.
  const fotoRef = useRef<HTMLImageElement | null>(null);
  const finalRef = useRef<{ simulacion: HTMLCanvasElement; actual: HTMLImageElement } | null>(null);

  // El logo va impreso en las imágenes; se trae mientras el vendedor captura la foto.
  useEffect(() => {
    precargarLogo();
  }, []);

  const agotado = consumo >= tope;
  const correoOk = CORREO.test(correo.trim());
  const vambeOk = /^https?:\/\/\S+$/.test(vambe.trim());
  const datosListos = correoOk && vambeOk;
  const listoParaGenerar = !!grado && datosListos;

  const cargar = useCallback(async (file: File) => {
    setError(null);
    if (!TIPOS.includes(file.type)) {
      setError("El archivo debe ser JPG, PNG o WebP.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await cargarImagen(url);
      const pts = await detectar(img);
      if (!pts) {
        setError("No se detecta un rostro de frente. Solicite otra fotografía, de frente y con el cabello recogido.");
        setEstado("error");
        return;
      }
      fotoRef.current = img;
      setOriginal(aDataUrl(reducir(img)));
      setGrado(null);
      setResultado(null);
      setEntregas([]);
      setEstado("listo");
    } catch {
      setError("No fue posible abrir la fotografía.");
      setEstado("error");
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  const generar = useCallback(async () => {
    const img = fotoRef.current;
    if (!original || !img || !grado) return;
    setEstado("generando");
    setError(null);
    try {
      const pts = await detectar(img);
      if (!pts) throw new Error("No se detecta un rostro de frente en la fotografía.");

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
          grado,
          correo: correo.trim(),
          vambe: vambe.trim(),
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

      finalRef.current = { simulacion: compuesta, actual: img };
      const pieza = aDataUrl(soloSimulacion(compuesta), 0.85);
      const comparativa = aDataUrl(actualYSimulacion(img, compuesta), 0.85);
      setResultado(compuesta.toDataURL("image/jpeg", 0.92));
      setEntregas([
        {
          clave: "simulacion",
          titulo: "Simulación",
          pie: "La imagen del resultado estimado",
          dataUrl: pieza,
        },
        {
          clave: "comparativa",
          titulo: "Comparativa",
          pie: "Estado actual y simulación, lado a lado",
          dataUrl: comparativa,
        },
      ]);
      setSimulacionId(data.id ?? null);
      setEnlace(data.token ? `${location.origin}/s/${data.token}` : null);
      setConsumo(data.usadas ?? consumo + 1);
      setEstado("hecho");

      // Guardar el resultado no debe bloquear al vendedor: si falla, la imagen ya está.
      fetch(`/api/simulaciones/${data.id}/resultado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagen: compuesta.toDataURL("image/jpeg", 0.9),
          pieza,
          comparativa,
        }),
      }).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar la simulación.");
      setEstado("error");
    }
  }, [original, grado, correo, vambe, consumo]);

  const copiarEnlace = async () => {
    if (!enlace) return;
    await navigator.clipboard.writeText(enlace);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const reiniciar = () => {
    setEstado("vacio");
    setOriginal(null);
    setResultado(null);
    setEntregas([]);
    setError(null);
    setGrado(null);
    setCorreo("");
    setVambe("");
    setSimulacionId(null);
    setEnlace(null);
    setRepeticiones(0);
    finalRef.current = null;
    fotoRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

  const bajar = (clave: string) => {
    const f = finalRef.current;
    if (!f) return;
    const base = correo.trim().split("@")[0] || "paciente";
    if (clave === "simulacion") descargar(soloSimulacion(f.simulacion), `${base}-simulacion.jpg`);
    else descargar(actualYSimulacion(f.actual, f.simulacion), `${base}-comparativa.jpg`);
  };

  const paso = !original ? 1 : !grado ? 2 : !datosListos ? 3 : 4;

  return (
    <>
      {/* Una sola mesa de trabajo: la fotografía y el control comparten superficie.
          Dos cajas sueltas lado a lado se leían como formulario de plantilla. */}
      <div className="crm-mesa grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_340px] lg:gap-12 lg:p-10">
        {/* Fotografía */}
        <div className="relative">
          <div
            className={`relative w-full overflow-hidden rounded-[var(--crm-r-md)] ${
              original
                ? "aspect-[4/5] max-h-[46dvh] bg-[var(--crm-surface-3)] lg:max-h-[560px]"
                : "aspect-[5/4] max-h-[34dvh] bg-[var(--crm-accent)] lg:max-h-[420px]"
            }`}
          >
            {!original && (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) cargar(f);
                }}
                className="group flex h-full w-full cursor-pointer flex-col items-center justify-center gap-4 px-8 text-center transition-colors hover:bg-[var(--crm-accent-soft)]"
              >
                <span className="grid size-14 place-items-center rounded-full border border-white/35 text-white transition-transform group-hover:scale-105">
                  <ImageUp className="size-6" strokeWidth={1.5} />
                </span>
                <span className="text-[19px] font-light text-white">Fotografía del paciente</span>
                <span className="max-w-[34ch] text-[13px] leading-relaxed text-white/70">
                  Arrastre la imagen o toque para elegirla desde el teléfono
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

            {estado === "hecho" && original && resultado && (
              <>
                <ReactCompareSlider
                  className="h-full w-full"
                  itemOne={<ReactCompareSliderImage src={original} alt="Actual" style={{ objectFit: "contain" }} />}
                  itemTwo={<ReactCompareSliderImage src={resultado} alt="Simulación" style={{ objectFit: "contain" }} />}
                />
                <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[var(--crm-ink)]/70 px-2.5 py-1 text-[11px] text-white">
                  Actual
                </span>
                <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-[var(--crm-accent)] px-2.5 py-1 text-[11px] text-[var(--crm-on-accent)]">
                  Simulación
                </span>
              </>
            )}

            {estado !== "hecho" && original && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={original} alt="Fotografía del paciente" className="h-full w-full object-contain" />
            )}

            {estado === "generando" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--crm-ink)]/35 backdrop-blur-[2px]">
                <span className="rounded-full bg-[var(--crm-surface)] px-4 py-2 text-[13px] text-[var(--crm-ink)]">
                  Generando la simulación
                </span>
                <span className="text-[12px] text-white/85">Tarda alrededor de 15 segundos</span>
              </div>
            )}
          </div>

          {estado === "hecho" && (
            <div className="flex flex-col items-center gap-4 pt-5">
              <p className="text-[12.5px] text-[var(--crm-ink-mute)]">Deslice el control para comparar</p>
              {simulacionId && (
                <Calificar valor={null} onCalificar={(n) => calificarSimulacion(simulacionId, n)} />
              )}
            </div>
          )}
        </div>

        {/* Control. Terminada la simulación, aquí manda el enlace: es lo que se le manda
            al paciente y lo que sustituye al envío de la fotografía. */}
        <div className="border-t border-[var(--crm-line)] pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
          {estado === "hecho" ? (
            <div className="space-y-7">
              {enlace && (
                <div>
                  <p className="crm-eyebrow mb-3">Enlace para el paciente</p>
                  <p className="crm-num truncate rounded-[var(--crm-r-sm)] bg-[var(--crm-surface-3)] px-3 py-2.5 text-[12px] text-[var(--crm-ink-mute)]">
                    {enlace}
                  </p>
                  <button
                    onClick={copiarEnlace}
                    className="crm-btn crm-btn-primary mt-3 w-full justify-center"
                  >
                    <Link2 className="size-4" /> {copiado ? "Enlace copiado" : "Copiar enlace"}
                  </button>
                  <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--crm-ink-faint)]">
                    Vence en {HORAS_VIGENCIA} horas. Puede reactivarlo desde el historial sin gastar
                    otra simulación.
                  </p>
                </div>
              )}
              {entregas.length > 0 && <Entregas entregas={entregas} onDescargar={bajar} />}
            </div>
          ) : (
            <ol className="space-y-6">
              <Paso n={1} activo={paso === 1} hecho={!!original} texto="Fotografía">
                {!original && (
                  <ul className="mt-2 space-y-1">
                    {GUIA.map((g) => (
                      <li key={g} className="text-[12.5px] text-[var(--crm-ink-mute)]">
                        {g}
                      </li>
                    ))}
                  </ul>
                )}
              </Paso>

              {/* El grado va aquí y no junto a los datos del paciente: es una propiedad
                  del caso y se elige mirando la fotografía, que está al lado. */}
              <Paso n={2} activo={paso === 2} hecho={!!grado} texto="Grado del caso">
                <div className="mt-2.5 space-y-1.5" role="radiogroup" aria-label="Grado del caso">
                  {GRADOS.map((g) => {
                    const puesto = grado === g.valor;
                    return (
                      <button
                        key={g.valor}
                        type="button"
                        role="radio"
                        aria-checked={puesto}
                        onClick={() => setGrado(g.valor)}
                        disabled={estado === "generando"}
                        className={`block w-full rounded-[var(--crm-r-md)] px-3.5 py-2.5 text-left transition-colors ${
                          puesto
                            ? "bg-[var(--crm-accent)] text-[var(--crm-on-accent)]"
                            : "bg-[var(--crm-surface-3)] text-[var(--crm-ink)] hover:bg-[var(--crm-accent-tint)]"
                        }`}
                      >
                        <span className="block text-[13.5px]">{g.titulo}</span>
                        <span
                          className={`mt-0.5 block text-[12px] leading-snug ${
                            puesto ? "text-[var(--crm-on-accent)]/75" : "text-[var(--crm-ink-mute)]"
                          }`}
                        >
                          {g.pie}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Paso>

              <Paso n={3} activo={paso === 3} hecho={datosListos} texto="Datos del paciente">
                <div className="mt-2.5 space-y-2.5">
                  <input
                    id="correo"
                    className="crm-input"
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    placeholder="Correo del paciente"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    disabled={estado === "generando"}
                  />
                  <input
                    id="vambe"
                    className="crm-input"
                    type="url"
                    autoComplete="off"
                    placeholder="Enlace del contacto en Vambe"
                    value={vambe}
                    onChange={(e) => setVambe(e.target.value)}
                    disabled={estado === "generando"}
                  />
                  <p className="text-[12px] leading-relaxed text-[var(--crm-ink-faint)]">
                    El enlace de Vambe se copia desde la conversación del contacto.
                  </p>
                </div>
              </Paso>

              <Paso n={4} activo={paso === 4} hecho={false} texto="Generar y enviar el enlace" />
            </ol>
          )}

          {error && (
            <p
              className="mt-5 flex items-start gap-2 rounded-[var(--crm-r-sm)] bg-[var(--crm-danger)]/8 px-3 py-2.5 text-[13px] text-[var(--crm-ink)]"
              role="alert"
            >
              <AlertCircle className="mt-px size-4 shrink-0 text-[var(--crm-danger)]" />
              {error}
            </p>
          )}

          {agotado && !error && (
            <p className="mt-5 rounded-[var(--crm-r-sm)] bg-[var(--crm-danger)]/8 px-3 py-2.5 text-[13px] text-[var(--crm-ink)]">
              Alcanzó el límite de {tope} simulaciones de este mes. Se restablece el día 1.
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3">
            {estado !== "generando" && estado !== "hecho" && original && (
              <button
                onClick={generar}
                disabled={!listoParaGenerar || agotado}
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

            {original && (
              <button onClick={reiniciar} className="crm-btn crm-btn-secondary w-full justify-center">
                Cargar otra fotografía
              </button>
            )}

            {/* Repetir queda discreto: entre corridas el resultado apenas cambia y como
                botón invita a gastar cuota persiguiendo una mejora que no llega. */}
            {estado === "hecho" && repeticiones < 1 && !agotado && (
              <button
                onClick={() => {
                  setRepeticiones((n) => n + 1);
                  generar();
                }}
                className="mx-auto mt-1 flex items-center gap-1.5 text-[12.5px] text-[var(--crm-ink-faint)] underline underline-offset-4 hover:text-[var(--crm-ink-mute)]"
              >
                <RotateCcw className="size-3.5" /> Generar otra vez
              </button>
            )}
          </div>
        </div>
      </div>

      {/* El aviso, tal cual lo ve el paciente en el enlace. Está aquí para que el asesor
          sepa exactamente con qué texto se entrega y no prometa de más en la conversación. */}
      <div className="crm-mesa mt-7 p-6 sm:p-8">
        <p className="text-[14.5px] text-[var(--crm-ink)]">{LEGAL_TITULO}</p>
        <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-[var(--crm-ink-mute)]">
          {LEGAL_CUERPO}
        </p>
        {/* "Calibrado" y no "entrenado": el modelo que corre es nano-banana con el prompt
            ajustado contra esos casos, no el LoRA. Es cierto y se sostiene si preguntan. */}
        <p className="mt-4 text-[12px] text-[var(--crm-ink-faint)]">
          Calibrado con más de 100 casos reales de Otomodelación Belab. Proyecto en mejora continua.
        </p>
      </div>
    </>
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
    <li className={activo || hecho ? "" : "opacity-35"}>
      <div className="flex items-baseline gap-3">
        {/* Número en tipografía, no en circulito: el circulito numerado es el detalle
            que más delata una interfaz de plantilla. */}
        <span
          className={`w-4 shrink-0 text-[15px] font-light tabular-nums ${
            hecho ? "text-[var(--crm-accent)]" : "text-[var(--crm-ink-faint)]"
          }`}
        >
          {hecho ? <Check className="size-3.5" strokeWidth={2.5} /> : n}
        </span>
        <span className="text-[14.5px] text-[var(--crm-ink)]">{texto}</span>
      </div>
      {children ? <div className="mt-2 pl-7">{children}</div> : null}
    </li>
  );
}
