// Ubica las orejas en la foto para medir cuánto se separan de la cabeza.
// Un modelo de visión que "opina" el grado coincidió con Oscar en 5 de 17 casos; medir
// la distancia de la punta de la oreja al borde de la cara coincidió en 15 de 17
// (calibrado el 2026-09-21). La medición se hace en el navegador (medir.ts).
//
// Las cajas las da Gemini y no un segmentador: grounded_sam midió lo mismo (diferencias
// de 0.003) pero es un modelo comunitario que se duerme y tardaba 65-85 s en despertar,
// más que el límite de la ruta. Gemini responde en 2-4 s.

import { correr } from "./replicate";

const MODELO = "google/gemini-3-flash";

const PROMPT = `Detecta las dos orejas de la persona en la foto. Devuelve solo JSON: una lista con un objeto por oreja, {"box_2d": [ymin, xmin, ymax, xmax]} con coordenadas normalizadas de 0 a 1000. La caja debe cubrir la oreja completa, incluido su borde más externo.`;

/** Cajas de las orejas, [ymin, xmin, ymax, xmax] normalizadas a 0-1000. */
export async function cajasOrejas(imagenDataUrl: string, token: string): Promise<number[][] | null> {
  const r = await correr(
    MODELO,
    // Gemini 3 razona antes de responder: con pocos tokens de salida devuelve vacío.
    { images: [imagenDataUrl], prompt: PROMPT, temperature: 0, max_output_tokens: 3000, thinking_level: "low" },
    token,
    "grado"
  );
  if ("error" in r) return null;
  const texto = Array.isArray(r.output) ? r.output.join("") : String(r.output ?? "");
  const cajas = [...texto.matchAll(/\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/g)].map((m) =>
    m.slice(1, 5).map(Number)
  );
  return cajas.length >= 2 ? cajas : null;
}
