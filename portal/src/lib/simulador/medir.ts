import type { Grado } from "./grado";
import { LATERAL_DER, LATERAL_IZQ, type Punto } from "./landmarks";

// Cortes sobre cuánto sale la oreja más allá del borde de la cara, en proporción al
// ancho de la cara. Calibrados con la clasificación de Oscar de 17 casos (2026-09-21):
// graves 0.135-0.176, medios 0.094-0.098, leve 0.081.
const CORTE_GRAVE = 0.13;
const CORTE_MEDIO = 0.09;

/**
 * Grado a partir de la máscara de las orejas (blanco = oreja) y los puntos de la cara,
 * los dos en las coordenadas del recorte de la cabeza. Mide, de cada lado, la distancia
 * del punto más externo de la oreja al borde de la cara, y promedia los dos lados.
 */
export function gradoPorMedida(mascara: ImageData, pts: Punto[]): Grado | null {
  const { width: ancho, height: alto, data } = mascara;
  const xIzq = pts[LATERAL_IZQ].x;
  const xDer = pts[LATERAL_DER].x;
  const anchoCara = xDer - xIzq;
  if (anchoCara <= 0) return null;

  let minIzq = Infinity;
  let maxDer = -Infinity;
  const mitad = ancho / 2;
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (data[(y * ancho + x) * 4] <= 127) continue;
      if (x < mitad) minIzq = Math.min(minIzq, x);
      else maxDer = Math.max(maxDer, x);
    }
  }
  if (minIzq === Infinity || maxDer === -Infinity) return null;

  const sale = ((xIzq - minIzq) / anchoCara + (maxDer - xDer) / anchoCara) / 2;
  return sale >= CORTE_GRAVE ? "alto" : sale >= CORTE_MEDIO ? "medio" : "bajo";
}
