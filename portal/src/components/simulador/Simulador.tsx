"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Copy, ImageUp, Link2, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { cargarImagen, detectar } from "@/lib/simulador/landmarks";
import { cajaCabeza } from "@/lib/simulador/geometria";
import { componer } from "@/lib/simulador/componer";
import {
  aDataUrl, actualYSimulacion, conMarca, descargar, precargarLogo, reducir, soloSimulacion,
} from "@/lib/simulador/entrega";
import { HORAS_VIGENCIA } from "@/lib/enlace";
import { GRADOS, type Grado } from "@/lib/simulador/grado";
import { LEGAL_EJECUTIVO_CUERPO, LEGAL_EJECUTIVO_TITULO } from "@/lib/legal";
import { BotonVista, Comparar } from "./Comparar";
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
 * El enlace de Vambe tal como se guarda, o null si lo pegado no es un enlace.
 *
 * Le pone el "https://" cuando falta. El ejecutivo copia y pega, y según de dónde copie
 * el enlace llega con protocolo o sin él; pedírselo es pedirle algo que no tiene por qué
 * saber.
 */
function normalizarEnlace(valor: string): string | null {
  const limpio = valor.trim();
  if (!limpio || /\s/.test(limpio)) return null;
  const conProtocolo = /^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`;
  try {
    // Un dominio de verdad lleva punto: sin esto "hola" pasaría como https://hola.
    return new URL(conProtocolo).hostname.includes(".") ? conProtocolo : null;
  } catch {
    return null;
  }
}

/**
 * Sugiere el grado midiendo la oreja: el servidor devuelve dónde están las orejas en el
 * recorte y aquí se mide cuánto sale la punta de la oreja del borde de la cara.
 */
async function sugerirGrado(
  img: HTMLImageElement,
  pts: Parameters<typeof cajaCabeza>[0],
  vigente: () => boolean
): Promise<Grado | null> {
  const res = await fetch("/api/grado", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cabeza: recorteCabeza(img, pts, 0.85) }),
  });
  const inicio: { id: string | null } | null = res.ok ? await res.json() : null;
  if (!inicio?.id) return null;

  // La fila de Replicate no tiene tiempo garantizado: se consulta cada 2 s hasta 90 s.
  let cajas: number[][] | null = null;
  for (let i = 0; i < 45 && !cajas; i++) {
    await new Promise((ok) => setTimeout(ok, 2000));
    if (!vigente()) return null;
    const d = await fetch(`/api/grado/${inicio.id}`).then((x) => (x.ok ? x.json() : { estado: "fallo" }));
    if (d.estado === "fallo") return null;
    if (d.estado === "listo") cajas = d.cajas;
  }
  if (!cajas) return null;

  // Los puntos de la cara, llevados a las coordenadas del recorte.
  const caja = cajaCabeza(pts, img.naturalWidth, img.naturalHeight);
  const escala = 1024 / caja.lado;
  const enRecorte = pts.map((p) => ({ x: (p.x - caja.x) * escala, y: (p.y - caja.y) * escala }));
  return gradoPorMedida(cajas, enRecorte);
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

/**
 * Valor del selector cuando genera administración y no un ejecutivo. Viaja al servidor
 * como cadena vacía, que es lo que la base guarda para "sin ejecutivo".
 */
const COMO_ADMIN = "ADMIN";

export function Simulador({
  usadas,
  tope,
  ejecutivos,
  esAdmin,
}: {
  usadas: number;
  tope: number;
  ejecutivos: { id: string; nombre: string; sedes: string[] }[];
  esAdmin: boolean;
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
  // El grado que mide el sistema. No se aplica solo: el ejecutivo lo confirma o elige
  // otro, así el grado siempre lo decide una persona.
  const [sugerencia, setSugerencia] = useState<Grado | null>(null);
  const fotoTurno = useRef(0);
  // Mientras se mide la oreja el paso 2 queda bloqueado, para no interrumpirlo.
  const [midiendo, setMidiendo] = useState(false);
  const [medicionFallo, setMedicionFallo] = useState(false);
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
  // Cuántas lleva este ejecutivo en el mes; se le dice al terminar.
  const [resumenEjecutivo, setResumenEjecutivo] = useState<{ nombre: string; n: number } | null>(null);
  // La calificación es obligatoria: es la única medida de si el modelo está saliendo bien.
  const [calificacion, setCalificacion] = useState<number | null>(null);
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
  // La foto reducida, que es la que se sube y la que ve el paciente. Se guarda para
  // poder marcarla al generar sin volver a reducir.
  const reducidoRef = useRef<HTMLCanvasElement | null>(null);

  // El logo va impreso en las imágenes; se trae mientras el vendedor captura la foto.
  useEffect(() => {
    precargarLogo();
  }, []);

  const agotado = consumo >= tope;
  const correoOk = CORREO.test(correo.trim());
  // Se acepta el enlace aunque venga sin "https://": el ejecutivo lo copia de Vambe y
  // según de dónde lo copie llega con protocolo o sin él. Exigirlo apagaba el botón de
  // generar sin decir por qué.
  const vambeUrl = normalizarEnlace(vambe);
  const vambeOk = !!vambeUrl;
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
        setError("No se detecta un rostro de frente. Pide otra fotografía, de frente y con el cabello recogido.");
        setEstado("error");
        return;
      }
      fotoRef.current = img;
      // Aquí no se espera al logo ni se marca nada: lo que sigue es enseñar la foto y
      // arrancar la medición del grado, y un await en medio retrasaba las dos cosas.
      // La copia marcada se arma al generar, que es cuando hace falta.
      reducidoRef.current = reducir(img);
      setOriginal(aDataUrl(reducidoRef.current));
      setGrado(null);
      setSugerencia(null);
      setMedicionFallo(false);
      setOpciones([]);
      setElegida(0);
      setEstado("listo");

      // Se mide el grado. Si cambió la foto mientras tanto, la respuesta se descarta.
      const turno = ++fotoTurno.current;
      const vigente = () => turno === fotoTurno.current && !gradoRef.current;
      setMidiendo(true);
      sugerirGrado(img, pts, vigente)
        .then((g) => {
          if (!vigente()) return;
          setMidiendo(false);
          if (g) setSugerencia(g);
          else setMedicionFallo(true);
        })
        .catch(() => {
          if (vigente()) setMedicionFallo(true);
        })
        .finally(() => {
          if (turno === fotoTurno.current) setMidiendo(false);
        });
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

      // La foto que se guarda y ve el paciente va marcada; la del modelo no.
      await precargarLogo();
      const actualMarcada = reducidoRef.current ? aDataUrl(conMarca(reducidoRef.current)) : original;

      const res = await fetch("/api/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cabeza: recorteCabeza(img, pts, 0.95),
          original: actualMarcada,
          grado,
          fuerte: hayPrevia,
          ejecutivoId: ejecutivoId === COMO_ADMIN ? "" : ejecutivoId,
          correo: correo.trim(),
          vambe: vambeUrl,
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

      // Marcada, como la foto actual: es la que se sirve suelta en el enlace del
      // paciente. Las dos piezas de abajo se arman del canvas limpio, porque ellas
      // estampan su propia marca al montar el pie.
      const conLogo = conMarca(compuesta);
      setOriginal(actualMarcada);
      const pieza = aDataUrl(soloSimulacion(compuesta), 0.85);
      const comparativa = aDataUrl(actualYSimulacion(img, compuesta), 0.85);
      const nueva: Opcion = {
        id: data.id ?? null,
        enlace: data.token ? `${location.origin}/s/${data.token}` : null,
        resultado: aDataUrl(conLogo, 0.92),
        final: { simulacion: compuesta, actual: img },
        entregas: [
          { clave: "simulacion", titulo: "Simulación", pie: "La imagen del resultado estimado", dataUrl: pieza },
          { clave: "comparativa", titulo: "Comparativa", pie: "Estado actual y simulación, lado a lado", dataUrl: comparativa },
        ],
      };
      setOpciones((prev) => [...prev, nueva]);
      setElegida(opciones.length);
      setCalificacion(null);
      if (data.ejecutivo && typeof data.delEjecutivo === "number")
        setResumenEjecutivo({ nombre: data.ejecutivo, n: data.delEjecutivo });
      setYaCopio(false);
      setVista(0);
      setConsumo(data.usadas ?? consumo + 1);
      setEstado("hecho");

      // Guardar el resultado no debe bloquear al vendedor: si falla, la imagen ya está.
      fetch(`/api/simulaciones/${data.id}/resultado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagen: aDataUrl(conLogo, 0.9),
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
    setSugerencia(null);
    setMedicionFallo(false);
    setMidiendo(false);
    fotoTurno.current++;
    setEjecutivoId("");
    setCorreo("");
    setVambe("");
    setFolioCopiado(false);
    setRepeticiones(0);
    setEditando(null);
    setVista(0);
    setYaCopio(false);
    setResumenEjecutivo(null);
    setCalificacion(null);
    fotoRef.current = null;
    reducidoRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

  const bajar = (clave: string) => {
    const f = op?.final;
    if (!f) return;
    const base = correo.trim().split("@")[0] || "paciente";
    if (clave === "simulacion") descargar(soloSimulacion(f.simulacion), `${base}-simulacion.jpg`);
    else descargar(actualYSimulacion(f.actual, f.simulacion), `${base}-comparativa.jpg`);
  };

  // El paso en curso: el primero sin terminar, salvo que el ejecutivo haya pedido
  // cambiar uno ya hecho.
  const siguiente = !original ? 1 : !grado ? 2 : !datosListos ? 3 : 4;
  const actual = editando ?? siguiente;
  const ocupado = estado === "generando";
  const tituloGrado = GRADOS.find((g) => g.valor === grado)?.titulo;

  const abrirSelector = () => inputRef.current?.click();
  // Con dos opciones, el primer paso del resultado es elegir cuál mandar.
  const base = opciones.length > 1 ? 1 : 0;
  const calificado = calificacion !== null;
  // Tres estrellas o menos es el ejecutivo diciendo que no la va a mandar así. El
  // reintento deja de ser el enlace discreto del fondo y sube a donde está mirando.
  const quedoMal = calificacion !== null && calificacion <= 3;
  const puedeRepetir = repeticiones < 1 && !agotado;

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
                <span className="text-[16px] text-white/90">Tarda unos 15 segundos. No cierres esta ventana.</span>
              </div>
            )}
          </div>

          {estado === "hecho" && (
            <div className="mt-3">
              <BotonVista vista={vista} onVista={setVista} />
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
              {resumenEjecutivo && (
                <p className="rounded-[var(--crm-r-md)] bg-[var(--crm-surface)] px-4 py-3 text-[16px] text-[var(--crm-ink)]">
                  {resumenEjecutivo.nombre} lleva{" "}
                  <span className="crm-num font-semibold">{resumenEjecutivo.n}</span>{" "}
                  {resumenEjecutivo.n === 1 ? "simulación" : "simulaciones"} este mes.
                </p>
              )}

              {opciones.length > 1 && (
                <Paso n={1} total={3} estado="listo-abierto" titulo="Elige la opción que se ve mejor">
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

              {/* Calificar va antes de copiar, y no al final: es la única medida de si
                  el modelo está saliendo bien, y preguntada después de mandar el enlace
                  llega cuando el ejecutivo ya dio el caso por cerrado. Además es lo que
                  decide si esta simulación se manda o se vuelve a generar. */}
              <Paso
                n={base + 1}
                total={base + 2}
                estado={calificado ? "listo-abierto" : "actual"}
                titulo="Califica el resultado"
              >
                {simulacionId && (
                  <Calificar
                    key={simulacionId}
                    grande
                    valor={null}
                    etiqueta=""
                    onCalificar={async (n) => {
                      const r = await calificarSimulacion(simulacionId, n);
                      if (!r || !("error" in r) || !r.error) setCalificacion(n);
                      return r;
                    }}
                  />
                )}
                {!calificado && (
                  <p className="mt-2 text-[15px] text-[var(--crm-ink-mute)]">
                    Toca las estrellas: de 1 a 5, qué tan bien quedó la simulación.
                  </p>
                )}
                {quedoMal && puedeRepetir && (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setRepeticiones((n) => n + 1);
                        generar();
                      }}
                      className="crm-btn crm-btn-primary crm-btn-lg w-full"
                    >
                      <RotateCcw className="size-5" /> Generar otra opción
                    </button>
                    <p className="mt-2 text-[15px] text-[var(--crm-ink-mute)]">
                      Se queda la que ya tienes y eliges cuál mandar. Cuenta como otra
                      simulación del mes.
                    </p>
                  </div>
                )}
                {quedoMal && !puedeRepetir && (
                  <p className="mt-4 text-[15px] text-[var(--crm-ink)]">
                    {agotado
                      ? `Ya se usaron las ${tope} simulaciones de este mes.`
                      : "Ya generaste las dos opciones de este paciente."}
                  </p>
                )}
              </Paso>

              <Paso
                n={base + 2}
                total={base + 2}
                estado={!calificado ? "falta" : yaCopio ? "listo-abierto" : "actual"}
                titulo="Copia el enlace y mándaselo al paciente por WhatsApp"
              >
                {enlace && (
                  <>
                    <button
                      onClick={copiarEnlace}
                      disabled={!calificado}
                      className="crm-btn crm-btn-primary crm-btn-xl w-full"
                    >
                      {copiado ? <Check className="size-5" /> : <Link2 className="size-5" />}
                      {copiado ? "Enlace copiado" : "Copiar enlace para el paciente"}
                    </button>
                    <p className="mt-3 text-[16px] text-[var(--crm-ink)]">
                      {!calificado
                        ? `Pendiente: califica el resultado en el paso ${base + 1}.`
                        : yaCopio
                          ? "Listo. Ahora pégalo en la conversación de WhatsApp del paciente."
                          : `El paciente lo abre en su teléfono. Dura ${HORAS_VIGENCIA} horas.`}
                    </p>
                  </>
                )}
              </Paso>

              {/* Empezar de nuevo no es un paso del caso: el caso terminó al calificar y
                  copiar. Va suelto al final, sin número. */}
              <div className="pt-1">
                <button
                  onClick={reiniciar}
                  disabled={!calificado}
                  className="crm-btn crm-btn-secondary crm-btn-lg w-full"
                >
                  Hacer otra simulación
                </button>
                {!calificado && (
                  <p className="mt-2 text-[15px] text-[var(--crm-ink)]">
                    Pendiente: califica el resultado en el paso {base + 1}.
                  </p>
                )}
              </div>


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
                titulo="Sube la foto del paciente"
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
                titulo="Elige qué tan separadas están las orejas"
                resumen={tituloGrado}
                onCambiar={original && !ocupado ? () => setEditando(2) : undefined}
              >
                {midiendo && (
                  <div
                    className="mb-3 rounded-[var(--crm-r-md)] border-2 border-[var(--crm-accent)] bg-[var(--crm-surface)] px-4 py-4"
                    role="status"
                  >
                    <p className="flex items-center gap-3 text-[17px] font-medium text-[var(--crm-ink)]">
                      <Loader2 className="size-6 animate-spin text-[var(--crm-accent)]" />
                      Midiendo las orejas…
                    </p>
                    <p className="mt-1 pl-9 text-[15px] text-[var(--crm-ink-mute)]">
                      El sistema calcula el grado. Tarda unos segundos, espera un momento.
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--crm-accent-tint-2)]">
                      <div className="barra-midiendo h-full w-1/3 rounded-full bg-[var(--crm-accent)]" />
                    </div>
                  </div>
                )}
                {sugerencia && !grado && (
                  <div className="mb-3 rounded-[var(--crm-r-md)] border-2 border-[var(--crm-accent)] bg-[var(--crm-surface)] px-4 py-4">
                    <p className="text-[16px] text-[var(--crm-ink)]">
                      El sistema midió las orejas y sugiere:{" "}
                      <span className="font-semibold">{GRADOS.find((g) => g.valor === sugerencia)?.titulo}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setGrado(sugerencia);
                        setEditando(null);
                      }}
                      className="crm-btn crm-btn-primary crm-btn-lg mt-3 w-full"
                    >
                      <Check className="size-5" /> Confirmar grado {GRADOS.find((g) => g.valor === sugerencia)?.titulo.toLowerCase()}
                    </button>
                    <p className="mt-2 text-center text-[14px] text-[var(--crm-ink-mute)]">O elige otro grado abajo.</p>
                  </div>
                )}
                {medicionFallo && !grado && (
                  <p className="mb-3 text-[15px] text-[var(--crm-ink)]">No se pudo medir. Elige el grado mirando la foto.</p>
                )}
                <div
                  className={`space-y-2 transition-opacity ${midiendo ? "pointer-events-none opacity-40" : ""}`}
                  role="radiogroup"
                  aria-label="Grado del caso"
                  aria-disabled={midiendo}
                >
                  {GRADOS.map((g) => {
                    const puesto = grado === g.valor;
                    const esSugerido = sugerencia === g.valor && !grado;
                    return (
                      <button
                        key={g.valor}
                        type="button"
                        role="radio"
                        aria-checked={puesto}
                        onClick={() => {
                          setGrado(g.valor);
                          setEditando(null);
                        }}
                        disabled={ocupado || midiendo}
                        className={`block w-full rounded-[var(--crm-r-md)] border-2 px-3 py-3 text-left transition-colors ${
                          puesto
                            ? "border-[var(--crm-accent)] bg-[var(--crm-accent)] text-[var(--crm-on-accent)]"
                            : esSugerido
                              ? "border-[var(--crm-accent)] bg-[var(--crm-accent-tint-2)] text-[var(--crm-ink)]"
                              : "border-[var(--crm-line-strong)] bg-[var(--crm-surface)] text-[var(--crm-ink)] hover:border-[var(--crm-accent)]"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <DibujoGrado grado={g.valor} className="size-16 shrink-0 rounded-[10px] bg-[var(--crm-surface)] text-[var(--crm-ink)]" />
                          <span>
                            <span className="block text-[17px] font-medium">
                              {g.titulo}
                              {esSugerido && (
                                <span className="ml-2 rounded-md bg-[var(--crm-accent)] px-2 py-0.5 text-[12px] font-semibold text-[var(--crm-on-accent)] uppercase">
                                  Sugerido
                                </span>
                              )}
                            </span>
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
                titulo="Escribe los datos del ejecutivo y del paciente"
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
                        Elige el nombre del ejecutivo
                      </option>
                      {ejecutivos.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nombre}
                        </option>
                      ))}
                      {/* Las pruebas de administración no se le cargan a nadie. */}
                      {esAdmin && <option value={COMO_ADMIN}>Administración (pruebas)</option>}
                    </select>
                  </Campo>
                  <Campo
                    id="correo"
                    etiqueta="Correo del paciente"
                    aviso={correo.trim() && !correoOk ? "Revisa el correo. Debe verse así: nombre@correo.com" : undefined}
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
                    ayuda="Cópialo desde la conversación del paciente en Vambe."
                    aviso={vambe.trim() && !vambeOk ? "Esto no parece un enlace de Vambe. Cópialo otra vez desde la conversación." : undefined}
                  >
                    <input
                      id="vambe"
                      className="crm-input text-[16px]!"
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      value={vambe}
                      onChange={(e) => setVambe(e.target.value)}
                      disabled={ocupado}
                    />
                  </Campo>
                </div>
              </Paso>

              <Paso n={4} estado={actual === 4 ? "actual" : "falta"} titulo="Genera la simulación" siempreAbierto>
                <button
                  onClick={generar}
                  disabled={!listoParaGenerar || agotado || ocupado}
                  className="crm-btn crm-btn-primary crm-btn-xl w-full"
                >
                  <Sparkles className={`size-5 ${ocupado ? "animate-pulse" : ""}`} />
                  {ocupado ? "Generando…" : "Generar simulación"}
                </button>
              </Paso>
            </>
          )}
        </div>
      </div>

      {/* Lo que el ejecutivo tiene que decirle al paciente al entregar la simulación:
          el mismo contenido que el aviso del enlace, dicho como instrucción. */}
      <div className="crm-mesa mt-7 p-6 sm:p-8">
        <p className="text-[16px] font-medium text-[var(--crm-ink)]">{LEGAL_EJECUTIVO_TITULO}</p>
        <p className="mt-2 max-w-[70ch] text-[15px] leading-relaxed text-[var(--crm-ink-soft)]">
          {LEGAL_EJECUTIVO_CUERPO}
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
  const etiqueta = esActual ? "Ahora" : listo ? "Listo" : estado === "falta" ? "Pendiente" : null;

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
