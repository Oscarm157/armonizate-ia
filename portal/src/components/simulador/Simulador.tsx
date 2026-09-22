"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Copy, ImageUp, Link2, RotateCcw, Sparkles } from "lucide-react";
import { cargarImagen, detectar } from "@/lib/simulador/landmarks";
import { cajaCabeza } from "@/lib/simulador/geometria";
import { componer } from "@/lib/simulador/componer";
import {
  aDataUrl, actualYSimulacion, descargar, precargarLogo, reducir, soloSimulacion,
} from "@/lib/simulador/entrega";
import { HORAS_VIGENCIA } from "@/lib/enlace";
import { GRADOS, type Grado } from "@/lib/simulador/grado";
import { LEGAL_CUERPO, LEGAL_TITULO } from "@/lib/legal";
import { BotonesVista, Comparar } from "./Comparar";
import { Entregas, type Entrega } from "./Entregas";
import { Calificar } from "./Calificar";
import { DibujoGrado } from "./DibujoGrado";
import { gradoPorMedida } from "@/lib/simulador/medir";
import { calificarSimulacion } from "@/app/admin/acciones-simulacion";

type Estado = "vacio" | "listo" | "generando" | "hecho" | "error";

type Opcion = {
  id: string | null;
  enlace: string | null;
  resultado: string;
  final: { simulacion: HTMLCanvasElement; actual: HTMLImageElement };
  entregas: Entrega[];
};

const TIPOS = ["image/jpeg", "image/png", "image/webp"];

const GUIA = [
  "De frente, mirando a la cámara",
  "Con el pelo recogido, orejas descubiertas",
  "Buena luz, sin sombras marcadas en el rostro",
  "Sin lentes ni gorra",
];

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sugiere el grado midiendo la oreja: el servidor devuelve la máscara de las orejas del
 * recorte y aquí se mide cuánto sale la punta de la oreja del borde de la cara.
 */
async function sugerirGrado(img: HTMLImageElement, pts: Parameters<typeof cajaCabeza>[0]): Promise<Grado | null> {
  const res = await fetch("/api/grado", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cabeza: recorteCabeza(img, pts, 0.85) }),
  });
  const d: { mascara: string | null } | null = res.ok ? await res.json() : null;
  if (!d?.mascara) return null;

  const m = await cargarImagen(d.mascara);
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(m, 0, 0, 1024, 1024);
  // Los puntos de la cara, llevados a las coordenadas del recorte.
  const caja = cajaCabeza(pts, img.naturalWidth, img.naturalHeight);
  const escala = 1024 / caja.lado;
  const enRecorte = pts.map((p) => ({ x: (p.x - caja.x) * escala, y: (p.y - caja.y) * escala }));
  return gradoPorMedida(ctx.getImageData(0, 0, 1024, 1024), enRecorte);
}

/** Recorte cuadrado de la cabeza: el modelo necesita píxeles de oreja para trabajar. */
function recorteCabeza(img: HTMLImageElement, pts: Parameters<typeof cajaCabeza>[0], calidad: number) {
  const caja = cajaCabeza(pts, img.naturalWidth, img.naturalHeight);
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1024;
  c.getContext("2d")!.drawImage(img, caja.x, caja.y, caja.lado, caja.lado, 0, 0, 1024, 1024);
  return c.toDataURL("image/jpeg", calidad);
}

export function Simulador({
  usadas,
  tope,
  ejecutivos,
}: {
  usadas: number;
  tope: number;
  ejecutivos: { id: string; nombre: string }[];
}) {
  const [estado, setEstado] = useState<Estado>("vacio");
  const [error, setError] = useState<string | null>(null);
  const [consumo, setConsumo] = useState(usadas);
  const [original, setOriginal] = useState<string | null>(null);
  // Cada generación es una opción. Normalmente hay una; si el ejecutivo pide otra
  // porque la primera no quedó bien, se quedan las dos para que elija cuál mandar: el
  // modelo varía entre corridas y no hay forma automática fiable de saber cuál salió
  // mejor (probado el 2026-09-21), el ojo del ejecutivo sí lo sabe.
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [elegida, setElegida] = useState(0);
  const [grado, setGrado] = useState<Grado | null>(null);
  // Si el grado lo puso el sistema y no el ejecutivo: se le dice para que lo revise.
  const [sugerido, setSugerido] = useState(false);
  const fotoTurno = useRef(0);
  const gradoRef = useRef(grado);
  useEffect(() => {
    gradoRef.current = grado;
  }, [grado]);
  // Se elige en cada simulación, a propósito sin recordar el anterior: el acceso es
  // compartido y el mismo equipo lo usan varias personas.
  const [ejecutivoId, setEjecutivoId] = useState("");
  const [correo, setCorreo] = useState("");
  const [vambe, setVambe] = useState("");
  const [copiado, setCopiado] = useState(false);
  // Copiar el aviso "Enlace copiado" dura 2 s; esto recuerda que ya se copió para
  // marcar el paso como LISTO y pasar el resaltado al siguiente.
  const [yaCopio, setYaCopio] = useState(false);
  const [folioCopiado, setFolioCopiado] = useState(false);
  const [repeticiones, setRepeticiones] = useState(0);
  // Paso que el ejecutivo reabrió con "Cambiar"; null = el primero sin terminar.
  const [editando, setEditando] = useState<number | null>(null);
  // Qué se ve en el comparador: 100 = foto actual, 0 = simulación.
  const [vista, setVista] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // La foto tal como la subió el vendedor, sin reducir ni recomprimir. Es sobre esta
  // que se compone: usar la versión reducida (la que se sube por el límite de la
  // petición) hacía que la entrega saliera a la resolución de entrada y no a la del
  // modelo, que genera en 2K.
  const fotoRef = useRef<HTMLImageElement | null>(null);

  // El logo va impreso en las imágenes; se trae mientras el vendedor captura la foto.
  useEffect(() => {
    precargarLogo();
  }, []);

  const agotado = consumo >= tope;
  const correoOk = CORREO.test(correo.trim());
  const vambeOk = /^https?:\/\/\S+$/.test(vambe.trim());
  const datosListos = !!ejecutivoId && correoOk && vambeOk;
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
      setSugerido(false);
      setOpciones([]);
      setElegida(0);
      setEstado("listo");

      // El grado se sugiere solo; el ejecutivo lo puede cambiar. Si la respuesta llega
      // cuando ya eligió uno, o ya cambió de foto, no se toca nada.
      const turno = ++fotoTurno.current;
      sugerirGrado(img, pts)
        .then((sugerencia) => {
          if (!sugerencia || turno !== fotoTurno.current || gradoRef.current) return;
          setGrado(sugerencia);
          setSugerido(true);
        })
        .catch(() => {});
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
    const hayPrevia = opciones.length > 0;
    setEstado("generando");
    setError(null);
    try {
      const pts = await detectar(img);
      if (!pts) throw new Error("No se detecta un rostro de frente en la fotografía.");

      const res = await fetch("/api/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabeza: recorteCabeza(img, pts, 0.95),
          original,
          grado,
          fuerte: hayPrevia,
          ejecutivoId,
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

      const pieza = aDataUrl(soloSimulacion(compuesta), 0.85);
      const comparativa = aDataUrl(actualYSimulacion(img, compuesta), 0.85);
      const nueva: Opcion = {
        id: data.id ?? null,
        enlace: data.token ? `${location.origin}/s/${data.token}` : null,
        resultado: compuesta.toDataURL("image/jpeg", 0.92),
        final: { simulacion: compuesta, actual: img },
        entregas: [
          { clave: "simulacion", titulo: "Simulación", pie: "La imagen del resultado estimado", dataUrl: pieza },
          { clave: "comparativa", titulo: "Comparativa", pie: "Estado actual y simulación, lado a lado", dataUrl: comparativa },
        ],
      };
      setOpciones((prev) => [...prev, nueva]);
      setElegida(opciones.length);
      setYaCopio(false);
      setVista(0);
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
      // Si falla la segunda, la primera sigue ahí y se puede mandar.
      setEstado(hayPrevia ? "hecho" : "error");
    }
  }, [original, grado, ejecutivoId, correo, vambe, consumo, opciones.length]);

  const op = opciones[elegida];
  const resultado = op?.resultado ?? null;
  const enlace = op?.enlace ?? null;
  const simulacionId = op?.id ?? null;

  const copiarEnlace = async () => {
    if (!enlace) return;
    await navigator.clipboard.writeText(enlace);
    setCopiado(true);
    setYaCopio(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const copiarFolio = async () => {
    if (!simulacionId) return;
    await navigator.clipboard.writeText(simulacionId);
    setFolioCopiado(true);
    setTimeout(() => setFolioCopiado(false), 2000);
  };

  const reiniciar = () => {
    setEstado("vacio");
    setOriginal(null);
    setOpciones([]);
    setElegida(0);
    setError(null);
    setGrado(null);
    setSugerido(false);
    fotoTurno.current++;
    setEjecutivoId("");
    setCorreo("");
    setVambe("");
    setFolioCopiado(false);
    setRepeticiones(0);
    setEditando(null);
    setVista(0);
    setYaCopio(false);
    fotoRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

  const bajar = (clave: string) => {
    const f = op?.final;
    if (!f) return;
    const base = correo.trim().split("@")[0] || "paciente";
    if (clave === "simulacion") descargar(soloSimulacion(f.simulacion), `${base}-simulacion.jpg`);
    else descargar(actualYSimulacion(f.actual, f.simulacion), `${base}-comparativa.jpg`);
  };

  // Lo que falta, en palabras. Se enseña junto al botón de generar para que nadie
  // tenga que adivinar por qué no se puede todavía.
  const faltantes = [
    !original && "la foto del paciente",
    !grado && "el grado del caso",
    !ejecutivoId && "el nombre del ejecutivo",
    !correoOk && "el correo del paciente",
    !vambeOk && "el enlace de Vambe",
  ].filter(Boolean) as string[];

  // El paso en curso: el primero sin terminar, salvo que el ejecutivo haya pedido
  // cambiar uno ya hecho.
  const siguiente = !original ? 1 : !grado ? 2 : !datosListos ? 3 : 4;
  const actual = editando ?? siguiente;
  const ocupado = estado === "generando";
  const tituloGrado = GRADOS.find((g) => g.valor === grado)?.titulo;

  const abrirSelector = () => inputRef.current?.click();
  // Con dos opciones, el primer paso del resultado es elegir cuál mandar.
  const base = opciones.length > 1 ? 1 : 0;

  // Al cambiar de paso, la pantalla va sola al que toca: en el celular queda debajo de
  // la foto, y al terminar de generar el enlace quedaba fuera de vista.
  const pasosRef = useRef<HTMLDivElement>(null);
  const primeraVez = useRef(true);
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    pasosRef.current
      ?.querySelector('[aria-current="step"]')
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [actual, estado]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setEditando(null);
            cargar(f);
          }
        }}
      />

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] md:items-start">
        {/* Fotografía. Queda fija mientras se avanza por los pasos. */}
        <div className="md:sticky md:top-4">
          <div
            className={`relative w-full overflow-hidden rounded-[var(--crm-r-lg)] ${
              original
                ? "aspect-[4/5] max-h-[60dvh] bg-[var(--crm-surface)] md:max-h-[min(620px,78dvh)]"
                : "aspect-[4/5] max-h-[40dvh] bg-[var(--crm-surface)] md:max-h-[min(620px,78dvh)]"
            }`}
          >
            {!original && (
              <button
                type="button"
                onClick={abrirSelector}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) cargar(f);
                }}
                className="flex h-full w-full flex-col items-center justify-center gap-3 border-2 border-dashed border-[var(--crm-line-strong)] px-8 text-center text-[var(--crm-ink-mute)] hover:border-[var(--crm-accent)] hover:text-[var(--crm-ink)]"
              >
                <ImageUp className="size-10" strokeWidth={1.5} />
                <span className="text-[17px]">Aquí aparecerá la foto del paciente</span>
              </button>
            )}

            {estado === "hecho" && original && resultado && (
              <Comparar
                actual={original}
                simulacion={resultado}
                posicion={vista}
                onPosicion={setVista}
                className="h-full w-full"
              />
            )}

            {estado !== "hecho" && original && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={original} alt="Fotografía del paciente" className="h-full w-full object-contain" />
            )}

            {ocupado && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--crm-ink)]/60 px-6 text-center">
                <Sparkles className="size-8 animate-pulse text-white" />
                <span className="text-[20px] font-medium text-white">Generando la simulación</span>
                <span className="text-[16px] text-white/90">Tarda unos 15 segundos. No cierre esta ventana.</span>
              </div>
            )}
          </div>

          {estado === "hecho" && (
            <div className="mt-3">
              <BotonesVista vista={vista} onVista={setVista} />
            </div>
          )}
        </div>

        {/* Pasos */}
        <div ref={pasosRef} className="flex scroll-mt-4 flex-col gap-3">
          {error && (
            <p
              className="flex items-start gap-3 rounded-[var(--crm-r-md)] border-2 border-[var(--crm-danger)] bg-[var(--crm-surface)] px-4 py-3.5 text-[16px] text-[var(--crm-ink)]"
              role="alert"
            >
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-[var(--crm-danger)]" />
              {error}
            </p>
          )}

          {agotado && estado !== "hecho" && (
            <p className="rounded-[var(--crm-r-md)] border-2 border-[var(--crm-danger)] bg-[var(--crm-surface)] px-4 py-3.5 text-[16px] text-[var(--crm-ink)]">
              Ya se usaron las {tope} simulaciones de este mes. Se reinicia el día 1.
            </p>
          )}

          {estado === "hecho" ? (
            <>
              {opciones.length > 1 && (
                <Paso n={1} total={4} estado="listo-abierto" titulo="Elija la opción que se ve mejor">
                  <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Opción a mandar">
                    {opciones.map((o, i) => {
                      const puesta = i === elegida;
                      return (
                        <button
                          key={o.id ?? i}
                          type="button"
                          role="radio"
                          aria-checked={puesta}
                          onClick={() => {
                            setElegida(i);
                            setYaCopio(false);
                            setVista(0);
                          }}
                          className={`overflow-hidden rounded-[var(--crm-r-md)] border-[3px] text-left ${
                            puesta ? "border-[var(--crm-accent)]" : "border-[var(--crm-line-strong)] hover:border-[var(--crm-accent)]"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={o.resultado} alt={`Opción ${i + 1}`} className="aspect-[4/5] w-full bg-[var(--crm-surface-3)] object-contain" />
                          <span
                            className={`flex min-h-11 items-center justify-center gap-1.5 text-[16px] font-medium ${
                              puesta ? "bg-[var(--crm-accent)] text-[var(--crm-on-accent)]" : "bg-[var(--crm-surface)] text-[var(--crm-ink)]"
                            }`}
                          >
                            {puesta && <Check className="size-4" />} Opción {i + 1}
                            {puesta ? " · elegida" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Paso>
              )}

              <Paso n={base + 1} total={base + 3} estado={yaCopio ? "listo-abierto" : "actual"} titulo="Copie el enlace y mándelo al paciente por WhatsApp">
                {enlace && (
                  <>
                    <button onClick={copiarEnlace} className="crm-btn crm-btn-primary crm-btn-xl w-full">
                      {copiado ? <Check className="size-5" /> : <Link2 className="size-5" />}
                      {copiado ? "Enlace copiado" : "Copiar enlace para el paciente"}
                    </button>
                    <p className="mt-3 text-[16px] text-[var(--crm-ink)]">
                      {yaCopio
                        ? "Listo. Ahora péguelo en la conversación de WhatsApp del paciente."
                        : `El paciente lo abre en su teléfono. Dura ${HORAS_VIGENCIA} horas.`}
                    </p>
                  </>
                )}
              </Paso>

              <Paso n={base + 2} total={base + 3} estado="abierto" titulo="Califique cómo quedó (opcional)">
                {simulacionId && (
                  <Calificar key={simulacionId} grande valor={null} etiqueta="" onCalificar={(n) => calificarSimulacion(simulacionId, n)} />
                )}
              </Paso>

              <Paso n={base + 3} total={base + 3} estado={yaCopio ? "actual" : "abierto"} titulo="Para otro paciente, empiece de nuevo">
                <button onClick={reiniciar} className="crm-btn crm-btn-secondary crm-btn-lg w-full">
                  Hacer otra simulación
                </button>
              </Paso>

              {repeticiones < 1 && !agotado && (
                <button
                  onClick={() => {
                    setRepeticiones((n) => n + 1);
                    generar();
                  }}
                  className="mx-auto flex min-h-11 items-center gap-2 text-[15px] text-[var(--crm-ink-mute)] underline underline-offset-4"
                >
                  <RotateCcw className="size-4" /> No quedó bien. Generar otra opción
                </button>
              )}

              <details className="rounded-[var(--crm-r-md)] bg-[var(--crm-surface)] px-4 py-3">
                <summary className="min-h-10 cursor-pointer py-2 text-[15px] text-[var(--crm-ink-mute)]">
                  Descargar las imágenes o ver el folio
                </summary>
                <div className="space-y-5 pt-3 pb-2">
                  {simulacionId && (
                    <div>
                      <p className="mb-2 text-[14px] text-[var(--crm-ink-mute)]">Folio de la simulación</p>
                      <div className="flex items-center gap-2">
                        <p className="crm-num min-w-0 flex-1 truncate rounded-[var(--crm-r-sm)] bg-[var(--crm-surface-3)] px-3 py-2.5 text-[13px] text-[var(--crm-ink-mute)]">
                          {simulacionId}
                        </p>
                        <button onClick={copiarFolio} className="crm-btn crm-btn-secondary shrink-0">
                          <Copy className="size-4" /> {folioCopiado ? "Copiado" : "Copiar"}
                        </button>
                      </div>
                    </div>
                  )}
                  {op && <Entregas entregas={op.entregas} onDescargar={bajar} />}
                </div>
              </details>
            </>
          ) : (
            <>
              <Paso
                n={1}
                estado={actual === 1 ? "actual" : original ? "listo" : "falta"}
                titulo="Suba la foto del paciente"
                resumen="Foto cargada"
                onCambiar={ocupado ? undefined : abrirSelector}
              >
                <button onClick={abrirSelector} disabled={ocupado} className="crm-btn crm-btn-primary crm-btn-lg w-full">
                  <ImageUp className="size-5" /> Elegir foto
                </button>
                <p className="mt-4 mb-2 text-[15px] text-[var(--crm-ink)]">La foto debe ser:</p>
                <ul className="space-y-1.5">
                  {GUIA.map((g) => (
                    <li key={g} className="flex items-start gap-2 text-[15px] text-[var(--crm-ink-soft)]">
                      <Check className="mt-1 size-4 shrink-0 text-[var(--crm-accent)]" /> {g}
                    </li>
                  ))}
                </ul>
              </Paso>

              {/* El grado se elige mirando la foto, que está al lado. */}
              <Paso
                n={2}
                estado={actual === 2 ? "actual" : grado ? "listo" : "falta"}
                titulo="Elija qué tan separadas están las orejas"
                resumen={tituloGrado && (sugerido ? `${tituloGrado} · sugerido por el sistema, revíselo` : tituloGrado)}
                onCambiar={original && !ocupado ? () => setEditando(2) : undefined}
              >
                <div className="space-y-2" role="radiogroup" aria-label="Grado del caso">
                  {GRADOS.map((g) => {
                    const puesto = grado === g.valor;
                    return (
                      <button
                        key={g.valor}
                        type="button"
                        role="radio"
                        aria-checked={puesto}
                        onClick={() => {
                          setGrado(g.valor);
                          setSugerido(false);
                          setEditando(null);
                        }}
                        disabled={ocupado}
                        className={`block w-full rounded-[var(--crm-r-md)] border-2 px-3 py-3 text-left transition-colors ${
                          puesto
                            ? "border-[var(--crm-accent)] bg-[var(--crm-accent)] text-[var(--crm-on-accent)]"
                            : "border-[var(--crm-line-strong)] bg-[var(--crm-surface)] text-[var(--crm-ink)] hover:border-[var(--crm-accent)]"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <DibujoGrado grado={g.valor} className="size-16 shrink-0 rounded-[10px] bg-[var(--crm-surface)] text-[var(--crm-ink)]" />
                          <span>
                            <span className="block text-[17px] font-medium">{g.titulo}</span>
                            <span className={`mt-0.5 block text-[15px] ${puesto ? "text-white/85" : "text-[var(--crm-ink-mute)]"}`}>
                              {g.pie}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Paso>

              {/* Este paso no se cierra solo al quedar completo: se cerraría a mitad de
                  escribir el enlace. Queda abierto hasta generar. */}
              <Paso
                n={3}
                estado={actual === 3 ? "actual" : datosListos ? "listo-abierto" : "falta"}
                titulo="Escriba los datos del ejecutivo y del paciente"
              >
                <div className="space-y-4">
                  <Campo id="ejecutivo" etiqueta="Nombre del ejecutivo">
                    <select
                      id="ejecutivo"
                      className="crm-input text-[16px]!"
                      value={ejecutivoId}
                      onChange={(e) => setEjecutivoId(e.target.value)}
                      disabled={ocupado}
                    >
                      <option value="" disabled>
                        Elija el nombre del ejecutivo
                      </option>
                      {ejecutivos.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nombre}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo
                    id="correo"
                    etiqueta="Correo del paciente"
                    aviso={correo.trim() && !correoOk ? "Revise el correo. Debe verse así: nombre@correo.com" : undefined}
                  >
                    <input
                      id="correo"
                      className="crm-input text-[16px]!"
                      type="email"
                      inputMode="email"
                      autoComplete="off"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      disabled={ocupado}
                    />
                  </Campo>
                  <Campo
                    id="vambe"
                    etiqueta="Enlace del paciente en Vambe"
                    ayuda="Cópielo desde la conversación del paciente en Vambe."
                    aviso={vambe.trim() && !vambeOk ? "Pegue el enlace completo. Empieza con https://" : undefined}
                  >
                    <input
                      id="vambe"
                      className="crm-input text-[16px]!"
                      type="url"
                      autoComplete="off"
                      value={vambe}
                      onChange={(e) => setVambe(e.target.value)}
                      disabled={ocupado}
                    />
                  </Campo>
                </div>
              </Paso>

              <Paso n={4} estado={actual === 4 ? "actual" : "falta"} titulo="Genere la simulación" siempreAbierto>
                <button
                  onClick={generar}
                  disabled={!listoParaGenerar || agotado || ocupado}
                  className="crm-btn crm-btn-primary crm-btn-xl w-full"
                >
                  <Sparkles className={`size-5 ${ocupado ? "animate-pulse" : ""}`} />
                  {ocupado ? "Generando…" : "Generar simulación"}
                </button>
                {faltantes.length > 0 && !ocupado && (
                  <p className="mt-3 text-[15px] text-[var(--crm-ink)]">
                    <span className="font-medium">Falta:</span> {faltantes.join(", ")}.
                  </p>
                )}
              </Paso>
            </>
          )}
        </div>
      </div>

      {/* El aviso, tal cual lo ve el paciente en el enlace. Está aquí para que el asesor
          sepa exactamente con qué texto se entrega y no prometa de más en la conversación. */}
      <div className="crm-mesa mt-7 p-6 sm:p-8">
        <p className="text-[16px] text-[var(--crm-ink)]">{LEGAL_TITULO}</p>
        <p className="mt-2 max-w-[70ch] text-[15px] leading-relaxed text-[var(--crm-ink-soft)]">
          {LEGAL_CUERPO}
        </p>
        {/* "Calibrado" y no "entrenado": el modelo que corre es nano-banana con el prompt
            ajustado contra esos casos, no el LoRA. Es cierto y se sostiene si preguntan. */}
        <p className="mt-4 text-[13px] text-[var(--crm-ink-faint)]">
          Calibrado con más de 100 casos reales de Otomodelación Belab. Proyecto en mejora continua.
        </p>
      </div>
    </>
  );
}

type EstadoPaso = "actual" | "listo" | "listo-abierto" | "abierto" | "falta";

/**
 * Un paso del flujo. El que toca ahora va resaltado en azul y abierto; los terminados
 * dicen LISTO y se pueden reabrir; los que faltan se ven, cerrados, para que se sepa
 * qué viene. El estado va en palabra además de color.
 */
function Paso({
  n, total = 4, estado, titulo, resumen, onCambiar, siempreAbierto = false, children,
}: {
  n: number;
  total?: number;
  estado: EstadoPaso;
  titulo: string;
  resumen?: string;
  onCambiar?: () => void;
  siempreAbierto?: boolean;
  children?: React.ReactNode;
}) {
  const esActual = estado === "actual";
  const listo = estado === "listo" || estado === "listo-abierto";
  const abierto = esActual || estado === "abierto" || estado === "listo-abierto" || siempreAbierto;
  const etiqueta = esActual ? "Ahora" : listo ? "Listo" : estado === "falta" ? "Falta" : null;

  return (
    <section
      aria-current={esActual ? "step" : undefined}
      className={`rounded-[var(--crm-r-lg)] border-2 px-4 py-4 sm:px-5 ${
        esActual
          ? "border-[var(--crm-accent)] bg-[var(--crm-accent-tint-2)]"
          : listo || estado === "abierto"
            ? "border-transparent bg-[var(--crm-surface)]"
            : "border-transparent bg-[var(--crm-surface-3)]"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Número en bloque y no en circulito: regla del proyecto (DESIGN.md). */}
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-[10px] text-[18px] font-semibold ${
            esActual
              ? "bg-[var(--crm-accent)] text-[var(--crm-on-accent)]"
              : listo
                ? "bg-[var(--crm-accent-tint-2)] text-[var(--crm-accent)]"
                : "bg-[var(--crm-line)] text-[var(--crm-ink-mute)]"
          }`}
          aria-hidden
        >
          {listo ? <Check className="size-5" strokeWidth={2.75} /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold tracking-[0.06em] text-[var(--crm-ink-mute)] uppercase">
            Paso {n} de {total}
            {etiqueta && (
              <span className={esActual ? "text-[var(--crm-accent)]" : listo ? "text-[var(--crm-accent)]" : ""}>
                {" · "}
                {etiqueta}
              </span>
            )}
          </p>
          <h2
            className={`text-[17px] leading-snug font-medium ${
              estado === "falta" && !siempreAbierto ? "text-[var(--crm-ink-mute)]" : "text-[var(--crm-ink)]"
            }`}
          >
            {titulo}
          </h2>
          {estado === "listo" && resumen && <p className="text-[15px] text-[var(--crm-ink-soft)]">{resumen}</p>}
        </div>
        {estado === "listo" && onCambiar && (
          <button
            type="button"
            onClick={onCambiar}
            className="min-h-11 shrink-0 px-2 text-[15px] text-[var(--crm-accent)] underline underline-offset-4"
          >
            Cambiar
          </button>
        )}
      </div>
      {abierto && children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

function Campo({
  id, etiqueta, ayuda, aviso, children,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  aviso?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[15px] font-medium text-[var(--crm-ink)]">
        {etiqueta}
      </label>
      {children}
      {aviso ? (
        <p className="mt-1.5 text-[14.5px] text-[var(--crm-danger)]" role="alert">
          {aviso}
        </p>
      ) : ayuda ? (
        <p className="mt-1.5 text-[14px] text-[var(--crm-ink-mute)]">{ayuda}</p>
      ) : null}
    </div>
  );
}
