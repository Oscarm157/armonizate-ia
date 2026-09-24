"use client";

// Las dos imágenes que el vendedor manda por WhatsApp.
//
// Ambas llevan el logo de la clínica y el aviso impresos EN la imagen, no en la
// página: la imagen se reenvía sola, y sin logo no se sabe de quién viene, sin aviso
// una simulación se lee como una promesa de resultado.

import { cargarImagen } from "./landmarks";

import { LEGAL_IMAGEN } from "../legal";

const SITIO = "clinicaarmonizate.mx";

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

/**
 * Marca de agua: el logo grande al centro, muy tenue.
 *
 * Marca la imagen sin taparla. No impide que alguien la recorte, pero sí que se reuse
 * como si fuera una fotografía de resultado real de otra clínica.
 */
function marcaDeAgua(ctx: CanvasRenderingContext2D, ancho: number, alto: number) {
  const lg = logoEnBlanco(alto * 0.16);
  if (!lg) return;
  const escala = Math.min(1, (ancho * 0.62) / lg.width);
  const w = lg.width * escala;
  const h = lg.height * escala;
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.drawImage(lg, (ancho - w) / 2, (alto - h) / 2, w, h);
  ctx.restore();
}

/**
 * La misma imagen con la marca de agua encima.
 *
 * Es para las fotos sueltas que el paciente ve en su enlace, que se guardan tal cual y
 * no pasan por las piezas con pie. Sin esto la simulación viajaba limpia y podía
 * reusarse como si fuera la fotografía de un resultado real.
 */
export function conMarca(fuente: HTMLCanvasElement | HTMLImageElement): HTMLCanvasElement {
  const ancho = "naturalWidth" in fuente ? fuente.naturalWidth : fuente.width;
  const alto = "naturalHeight" in fuente ? fuente.naturalHeight : fuente.height;
  const [c, ctx] = lienzo(ancho, alto);
  ctx.drawImage(fuente, 0, 0, ancho, alto);
  marcaDeAgua(ctx, ancho, alto);
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
  const blanco = logoEnBlanco(alto * 0.3);
  if (blanco) ctx.drawImage(blanco, centro - blanco.width / 2, y + alto * 0.1);

  ctx.fillStyle = "#ffffff";
  ctx.font = `500 ${Math.round(alto * 0.11)}px ${familia()}`;
  ctx.fillText(SITIO, centro, y + alto * 0.52, ancho * 0.9);

  // El aviso completo, en las líneas que hagan falta: la imagen se reenvía sola y
  // tiene que llevar el texto entero, no una versión recortada.
  // En la imagen suelta, más angosta, salen más líneas: la letra se achica hasta que
  // el bloque quepa en lo que queda del pie.
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  let tam = alto * 0.068;
  let lineas: string[];
  for (;;) {
    ctx.font = `400 ${Math.round(tam)}px ${familia()}`;
    lineas = partir(ctx, LEGAL_IMAGEN, ancho * 0.9);
    if (lineas.length * tam * 1.35 <= alto * 0.34 || tam < alto * 0.03) break;
    tam *= 0.92;
  }
  const inicio = y + alto * 0.66 + tam / 2;
  lineas.forEach((l, i) => ctx.fillText(l, centro, inicio + i * tam * 1.35));
}

/** Parte un texto en líneas que quepan en `max` píxeles con la fuente actual. */
function partir(ctx: CanvasRenderingContext2D, texto: string, max: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(" ")) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > max && actual) {
      lineas.push(actual);
      actual = palabra;
    } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
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
  marcaDeAgua(ctx, simulacion.width, simulacion.height);
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

  marcaDeAgua(ctx, c.width, h);
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
