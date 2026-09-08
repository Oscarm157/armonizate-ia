"use client";

// Composición: de lo que devuelve el modelo se toma SOLO la zona de las orejas y se
// pega sobre la foto original.
//
// Sin este paso el resultado no es entregable en algo médico: el modelo devuelve al
// paciente con la piel suavizada, las cejas redibujadas y los ojos más abiertos, y
// además reencuadra la toma aunque el prompt se lo prohíba. Con este paso el rostro es
// el del paciente píxel por píxel y lo único distinto son las orejas.
//
// Port de scripts/02_componer.py y 09_componer_salida.py del repo armonizate-simulador.

import {
  detectar, FRENTE, LATERAL_DER, LATERAL_IZQ, NARIZ_BASE, RIGIDOS, type Punto,
} from "./landmarks";
import { pintarBandaOrejas, similitud } from "./geometria";

function lienzo(ancho: number, alto: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = ancho;
  c.height = alto;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("El navegador no permitió dibujar la imagen.");
  return [c, ctx];
}

/**
 * Lleva el warp a la exposición de la original usando la zona central de la cara como
 * referencia: es la parte que las dos imágenes comparten sin cambios. Sin esto la banda
 * compuesta entra con otro brillo y se nota el parche.
 */
function igualarExposicion(
  ctx: CanvasRenderingContext2D,
  base: CanvasRenderingContext2D,
  pts: Punto[],
  ancho: number,
  alto: number
): void {
  const wCara = pts[LATERAL_DER].x - pts[LATERAL_IZQ].x;
  const x0 = Math.round(pts[LATERAL_IZQ].x + 0.2 * wCara);
  const x1 = Math.round(pts[LATERAL_DER].x - 0.2 * wCara);
  const y0 = Math.round(Math.max(0, pts[FRENTE].y));
  const y1 = Math.round(Math.min(alto, pts[NARIZ_BASE].y));
  const w = x1 - x0;
  const h = y1 - y0;
  if (w < 20 || h < 20) return;

  const ref = base.getImageData(x0, y0, w, h).data;
  const act = ctx.getImageData(x0, y0, w, h).data;

  // media y desviación por canal en la zona de referencia
  const stats = (d: Uint8ClampedArray) => {
    const mu = [0, 0, 0];
    const sd = [0, 0, 0];
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) mu[c] += d[i + c];
    for (let c = 0; c < 3; c++) mu[c] /= n;
    for (let i = 0; i < d.length; i += 4)
      for (let c = 0; c < 3; c++) sd[c] += (d[i + c] - mu[c]) ** 2;
    for (let c = 0; c < 3; c++) sd[c] = Math.sqrt(sd[c] / n) + 1e-3;
    return { mu, sd };
  };

  const r = stats(ref);
  const a = stats(act);
  const ganancia = [0, 1, 2].map((c) => Math.min(1.4, Math.max(0.7, r.sd[c] / a.sd[c])));

  const todo = ctx.getImageData(0, 0, ancho, alto);
  const d = todo.data;
  for (let i = 0; i < d.length; i += 4)
    for (let c = 0; c < 3; c++) d[i + c] = (d[i + c] - a.mu[c]) * ganancia[c] + r.mu[c];
  ctx.putImageData(todo, 0, 0);
}

/**
 * Devuelve la foto original con las orejas de la imagen generada, en el encuadre
 * original exacto. `null` si no se detecta una cara en alguna de las dos.
 */
export async function componer(
  original: HTMLImageElement,
  generada: HTMLImageElement
): Promise<HTMLCanvasElement | null> {
  const ancho = original.naturalWidth;
  const alto = original.naturalHeight;

  const [cBase, base] = lienzo(ancho, alto);
  base.drawImage(original, 0, 0);

  const ptsOriginal = await detectar(original);
  const ptsGenerada = await detectar(generada);
  if (!ptsOriginal || !ptsGenerada) return null;

  // El modelo reencuadra aunque se le prohíba: aquí se devuelve al encuadre original.
  const m = similitud(
    RIGIDOS.map((i) => ptsGenerada[i]),
    RIGIDOS.map((i) => ptsOriginal[i])
  );
  if (!m) return null;

  const [, alineada] = lienzo(ancho, alto);
  alineada.setTransform(m.a, m.b, -m.b, m.a, m.tx, m.ty);
  alineada.drawImage(generada, 0, 0);
  alineada.setTransform(1, 0, 0, 1, 0, 0);
  igualarExposicion(alineada, base, ptsOriginal, ancho, alto);

  const [cMascara, mascara] = lienzo(ancho, alto);
  pintarBandaOrejas(mascara, ptsOriginal, ancho, alto);

  // Recorta la imagen alineada a la banda de las orejas...
  alineada.globalCompositeOperation = "destination-in";
  alineada.drawImage(cMascara, 0, 0);
  alineada.globalCompositeOperation = "source-over";

  // ...y la pega encima de la original, que queda intacta en todo lo demás.
  base.drawImage(alineada.canvas, 0, 0);
  return cBase;
}

/** Cuánto cambió la imagen final fuera de la zona de las orejas. 0 = rostro intacto. */
export function cambioFueraDeLasOrejas(
  original: HTMLImageElement,
  final: HTMLCanvasElement,
  pts: Punto[]
): number {
  const { width: ancho, height: alto } = final;
  const [, a] = lienzo(ancho, alto);
  a.drawImage(original, 0, 0);
  const [, mCtx] = lienzo(ancho, alto);
  pintarBandaOrejas(mCtx, pts, ancho, alto);

  const da = a.getImageData(0, 0, ancho, alto).data;
  const db = final.getContext("2d")!.getImageData(0, 0, ancho, alto).data;
  const dm = mCtx.getImageData(0, 0, ancho, alto).data;

  let suma = 0;
  let n = 0;
  for (let i = 0; i < da.length; i += 4) {
    if (dm[i + 3] > 128) continue; // dentro de la banda, no cuenta
    suma += (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
    n++;
  }
  return n ? suma / n : 0;
}
