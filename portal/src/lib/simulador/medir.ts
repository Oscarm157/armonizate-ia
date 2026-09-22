import type { Grado } from "./grado";
import { LATERAL_DER, LATERAL_IZQ, type Punto } from "./landmarks";

// Cortes sobre cuánto sale la oreja más allá del borde de la cara, en proporción al
// ancho de la cara. Calibrados con la clasificación de Oscar de 17 casos (2026-09-21):
// graves 0.135-0.176, medios 0.094-0.098, leve 0.081.
const CORTE_GRAVE = 0.13;
const CORTE_MEDIO = 0.09;

/**
 * Grado a partir de las cajas de las orejas ([ymin, xmin, ymax, xmax] en 0-1000) y los
 * puntos de la cara en coordenadas del recorte de la cabeza (lado 1024). Mide, de cada
 * lado, la distancia del borde externo de la oreja al borde de la cara, y promedia.
 */
export function gradoPorMedida(cajas: number[][], pts: Punto[], lado = 1024): Grado | null {
  const xIzq = pts[LATERAL_IZQ].x;
  const xDer = pts[LATERAL_DER].x;
  const anchoCara = xDer - xIzq;
  if (anchoCara <= 0) return null;

  const enPx = cajas.map(([, xmin, , xmax]) => [(xmin * lado) / 1000, (xmax * lado) / 1000]);
  const izq = enPx.filter(([a, b]) => (a + b) / 2 < lado / 2).map(([a]) => a);
  const der = enPx.filter(([a, b]) => (a + b) / 2 >= lado / 2).map(([, b]) => b);
  if (!izq.length || !der.length) return null;

  const sale = ((xIzq - Math.min(...izq)) / anchoCara + (Math.max(...der) - xDer) / anchoCara) / 2;
  return sale >= CORTE_GRAVE ? "alto" : sale >= CORTE_MEDIO ? "medio" : "bajo";
}
