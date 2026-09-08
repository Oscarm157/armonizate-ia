"use client";

// Las dos imágenes que el vendedor manda por WhatsApp.
//
// Ambas llevan el logo de la clínica y el aviso impresos EN la imagen, no en la
// página: la imagen se reenvía sola, y sin logo no se sabe de quién viene, sin aviso
// una simulación se lee como una promesa de resultado.

import { cargarImagen } from "./landmarks";

const SITIO = "clinicaarmonizate.mx";
const AVISO = "Simulación generada con inteligencia artificial · El resultado final puede variar";

const INDIGO = "#4D4E93";

let logo: HTMLImageElement | null = null;
let familiaCache: string | null = null;

/**
 * La familia tipográfica real del documento.
 *
 * En canvas hay que nombrar la fuente, y next/font no la expone como "Poppins" sino
 * con un nombre generado. Escribir "Poppins" en ctx.font caía al tipo del sistema, que
 * es justo lo que se veía mal en el pie de las imágenes.
 */
function familia(): string {
  if (!familiaCache) {
    familiaCache =
      getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  }
  return familiaCache;
}

/** El logo se carga una vez y se reusa; sin él las imágenes salen igual, sin marca. */
export async function precargarLogo(): Promise<void> {
  if (!logo) {
    try {
      logo = await cargarImagen("/logo-armonizate.png");
    } catch {
      logo = null;
    }
  }
}

function lienzo(ancho: number, alto: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = ancho;
  c.height = alto;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("El navegador no permitió dibujar la imagen.");
  return [c, ctx];
}

/**
 * Pie de la imagen: logo a la izquierda y aviso a la derecha, sobre el índigo de la
 * marca. El logo del archivo es negro, así que se repinta en blanco conservando su
 * silueta: sobre el índigo el original no se vería.
 */
function logoEnBlanco(altoLogo: number): HTMLCanvasElement | null {
  if (!logo) return null;
  const anchoLogo = Math.round((logo.naturalWidth / logo.naturalHeight) * altoLogo);
  const [c, ctx] = lienzo(anchoLogo, Math.round(altoLogo));
  ctx.drawImage(logo, 0, 0, anchoLogo, altoLogo);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, anchoLogo, altoLogo);
  return c;
}

function pintarPie(ctx: CanvasRenderingContext2D, ancho: number, y: number, alto: number) {
  ctx.fillStyle = INDIGO;
  ctx.fillRect(0, y, ancho, alto);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const centro = ancho / 2;

  // Logo centrado y con presencia: la imagen se reenvía por WhatsApp y funciona como
  // pieza de la clínica, no solo como entrega técnica.
  const blanco = logoEnBlanco(alto * 0.34);
  if (blanco) ctx.drawImage(blanco, centro - blanco.width / 2, y + alto * 0.22);

  ctx.fillStyle = "#ffffff";
  ctx.font = `500 ${Math.round(alto * 0.13)}px ${familia()}`;
  ctx.fillText(SITIO, centro, y + alto * 0.72, ancho * 0.9);

  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = `400 ${Math.round(alto * 0.082)}px ${familia()}`;
  ctx.fillText(AVISO, centro, y + alto * 0.87, ancho * 0.94);
}

function pintarEtiqueta(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, ancho: number) {
  const alto = Math.round(ancho * 0.072);
  const anchoCaja = ancho * 0.32;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(x + ancho * 0.035, y + ancho * 0.035, anchoCaja, alto, alto / 2);
  ctx.fill();
  ctx.fillStyle = INDIGO;
  ctx.font = `600 ${Math.round(alto * 0.44)}px ${familia()}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, x + ancho * 0.035 + anchoCaja / 2, y + ancho * 0.035 + alto / 2);
}

/** Solo la simulación, con logo y aviso al pie. */
export function soloSimulacion(simulacion: HTMLCanvasElement): HTMLCanvasElement {
  const pie = Math.round(simulacion.width * 0.42);
  const [c, ctx] = lienzo(simulacion.width, simulacion.height + pie);
  ctx.drawImage(simulacion, 0, 0);
  pintarPie(ctx, c.width, simulacion.height, pie);
  return c;
}

/** El estado actual y la simulación juntos, etiquetados, con logo y aviso al pie. */
export function actualYSimulacion(
  actual: HTMLImageElement,
  simulacion: HTMLCanvasElement
): HTMLCanvasElement {
  const w = simulacion.width;
  const h = simulacion.height;
  const sep = Math.round(w * 0.018);
  const pie = Math.round(w * 0.44);

  const [c, ctx] = lienzo(w * 2 + sep, h + pie);
  ctx.fillStyle = INDIGO;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(actual, 0, 0, w, h);
  ctx.drawImage(simulacion, w + sep, 0, w, h);

  pintarEtiqueta(ctx, "ACTUAL", 0, 0, w);
  // "Simulación" y no "Después": decir después sobre una imagen generada promete un
  // resultado, y esta foto se reenvía sola sin nadie que la explique.
  pintarEtiqueta(ctx, "SIMULACIÓN", w + sep, 0, w);
  pintarPie(ctx, c.width, h, pie);
  return c;
}

export function descargar(canvas: HTMLCanvasElement, nombre: string) {
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
    },
    "image/jpeg",
    0.95
  );
}

export function aDataUrl(canvas: HTMLCanvasElement, calidad = 0.92): string {
  return canvas.toDataURL("image/jpeg", calidad);
}

/**
 * Reduce una foto antes de subirla. Una foto de celular pesa varios MB y en base64
 * crece un tercio más, por encima del límite de cuerpo de una petición.
 */
export function reducir(img: HTMLImageElement, ladoMaximo = 1600): HTMLCanvasElement {
  const escala = Math.min(1, ladoMaximo / Math.max(img.naturalWidth, img.naturalHeight));
  const [c, ctx] = lienzo(
    Math.round(img.naturalWidth * escala),
    Math.round(img.naturalHeight * escala)
  );
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}
