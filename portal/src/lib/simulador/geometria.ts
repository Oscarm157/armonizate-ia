// Geometría del pipeline, portada de los scripts de Python del simulador
// (scripts/02_componer.py, 05_armar_zip.py y 08_encuadrar.py del repo
// armonizate-simulador). Los números salieron de calibrar contra 100 casos reales de
// la clínica: no se cambian a ojo.

import {
  CEJA_DER, CEJA_IZQ, FRENTE, LATERAL_DER, LATERAL_IZQ, MENTON, NARIZ_BASE,
  type Punto,
} from "./landmarks";

/** Recorte de la cabeza, en veces la altura de la cara (frente a mentón). */
const MARGEN_CABEZA = 1.9;

/** La banda de las orejas, en fracciones del ancho y alto de la cara. */
const FUERA = 0.44; // hacia afuera del borde de la cara: cubre la oreja separada
const DENTRO = 0.14; // hacia dentro: cubre la raíz de la oreja
const ARRIBA = 0.09; // por encima de la ceja
// Por debajo de la base de la nariz. Estuvo en 0.05 y dejaba el lóbulo fuera de la
// banda: la composición pegaba la oreja corregida arriba y conservaba la original
// abajo, y el resultado parecía una oreja movida de altura en vez de una pegada. Se
// vio dibujando la banda sobre las fotos: con 0.22 el pabellón entra completo en los
// once casos y la elipse todavía no alcanza la mandíbula ni la barba.
const ABAJO = 0.22;

export type Caja = { x: number; y: number; lado: number };

/**
 * Recorte cuadrado centrado en la cabeza.
 *
 * Existe porque el modelo necesita píxeles de oreja para trabajar: mandándole la foto
 * completa, con la cabeza pequeña en el cuadro, la corrección sale tímida.
 */
export function cajaCabeza(pts: Punto[], ancho: number, alto: number): Caja {
  const hCara = Math.abs(pts[MENTON].y - pts[FRENTE].y);
  const cx = (pts[LATERAL_IZQ].x + pts[LATERAL_DER].x) / 2;
  const cy = (pts[FRENTE].y + pts[MENTON].y) / 2;

  const lado = Math.min(MARGEN_CABEZA * hCara, alto, ancho);
  const x = Math.min(Math.max(cx - lado / 2, 0), ancho - lado);
  const y = Math.min(Math.max(cy - lado / 2, 0), alto - lado);
  return { x, y, lado };
}

export type Similitud = { a: number; b: number; tx: number; ty: number };

/**
 * Transformada de similitud (escala uniforme, rotación y traslación) que lleva los
 * puntos `desde` sobre los puntos `hacia`, por mínimos cuadrados.
 *
 * Es el equivalente 2D de estimateAffinePartial2D. No hace falta RANSAC: los puntos
 * rígidos de la cara son fiables y no traen valores atípicos.
 */
export function similitud(desde: Punto[], hacia: Punto[]): Similitud | null {
  const n = Math.min(desde.length, hacia.length);
  if (n < 2) return null;

  const cd = { x: 0, y: 0 };
  const ch = { x: 0, y: 0 };
  for (let i = 0; i < n; i++) {
    cd.x += desde[i].x; cd.y += desde[i].y;
    ch.x += hacia[i].x; ch.y += hacia[i].y;
  }
  cd.x /= n; cd.y /= n; ch.x /= n; ch.y /= n;

  let num1 = 0, num2 = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const px = desde[i].x - cd.x, py = desde[i].y - cd.y;
    const qx = hacia[i].x - ch.x, qy = hacia[i].y - ch.y;
    num1 += px * qx + py * qy;
    num2 += px * qy - py * qx;
    den += px * px + py * py;
  }
  if (den < 1e-6) return null;

  const a = num1 / den;
  const b = num2 / den;
  return { a, b, tx: ch.x - (a * cd.x - b * cd.y), ty: ch.y - (b * cd.x + a * cd.y) };
}

/**
 * Máscara suave de las dos orejas, derivada de la geometría de la cara.
 *
 * Elipses y no rectángulos: el borde recto deja una costura visible en el fondo
 * cuando la iluminación de las dos imágenes no coincide exactamente.
 */
export function pintarBandaOrejas(
  ctx: CanvasRenderingContext2D,
  pts: Punto[],
  ancho: number,
  alto: number
): void {
  const xIzq = pts[LATERAL_IZQ].x;
  const xDer = pts[LATERAL_DER].x;
  const wCara = Math.abs(xDer - xIzq);
  const hCara = Math.abs(pts[MENTON].y - pts[FRENTE].y);

  const y0 = Math.min(pts[CEJA_IZQ].y, pts[CEJA_DER].y) - ARRIBA * hCara;
  const y1 = pts[NARIZ_BASE].y + ABAJO * hCara;

  ctx.clearRect(0, 0, ancho, alto);
  ctx.fillStyle = "#fff";
  // El difuminado del borde es lo que funde la zona compuesta con la foto original.
  ctx.filter = `blur(${Math.max(4, 0.05 * wCara)}px)`;

  for (const [xBorde, signo] of [
    [xIzq, -1],
    [xDer, 1],
  ] as const) {
    const cx = xBorde + (signo * (FUERA - DENTRO) * wCara) / 2;
    const cy = (y0 + y1) / 2;
    const rx = ((FUERA + DENTRO) * wCara) / 2;
    const ry = (y1 - y0) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.filter = "none";
}
