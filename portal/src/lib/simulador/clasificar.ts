// Ubica las orejas en la foto para medir cuánto se separan de la cabeza.
// Un modelo de visión que "opina" el grado coincidió con Oscar en 5 de 17 casos; medir
// la distancia de la punta de la oreja al borde de la cara coincidió en 15 de 17
// (calibrado el 2026-09-21). La medición se hace en el navegador (medir.ts).
//
// Las cajas las da Gemini y no un segmentador: grounded_sam midió lo mismo (diferencias
// de 0.003) pero es un modelo comunitario que se duerme y tardaba 65-85 s en despertar,
// más que el límite de la ruta. Gemini responde en 2-4 s, pero la fila de Replicate
// llegó a retenerlo casi 60 s: por eso se arranca y se consulta aparte.

import { crear, leer } from "./replicate";

const MODELO = "google/gemini-3-flash";

const PROMPT = `Detecta las dos orejas de la persona en la foto. Devuelve solo JSON: una lista con un objeto por oreja, {"box_2d": [ymin, xmin, ymax, xmax]} con coordenadas normalizadas de 0 a 1000. La caja debe cubrir la oreja completa, incluido su borde más externo.`;

/** Arranca la ubicación de las orejas y devuelve el id para consultarla después. */
export async function iniciarCajas(imagenDataUrl: string, token: string): Promise<string | null> {
  const pred = await crear(
    MODELO,
    // Sin razonamiento: ubicar dos cajas no lo necesita, y con "low" llegó a tardar ~60 s
    // en vez de 3 (probado el 2026-09-21, misma medida en los dos modos).
    { images: [imagenDataUrl], prompt: PROMPT, temperature: 0, max_output_tokens: 1000, thinking_level: "none" },
    token,
    "grado"
  );
  return pred?.id ?? null;
}

export type EstadoCajas = { estado: "esperando" } | { estado: "listo"; cajas: number[][] } | { estado: "fallo" };

/**
 * Consulta la predicción. Solo acepta predicciones de este modelo: el id viene del
 * navegador y no debe servir para leer otras predicciones de la cuenta.
 */
export async function leerCajas(id: string, token: string): Promise<EstadoCajas> {
  const pred = await leer(id, token);
  if (!pred || pred.model !== MODELO) return { estado: "fallo" };
  if (pred.status === "starting" || pred.status === "processing") return { estado: "esperando" };
  if (pred.status !== "succeeded") return { estado: "fallo" };

  const texto = Array.isArray(pred.output) ? pred.output.join("") : String(pred.output ?? "");
  const cajas = [...texto.matchAll(/\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\]/g)].map((m) =>
    m.slice(1, 5).map(Number)
  );
  return cajas.length >= 2 ? { estado: "listo", cajas } : { estado: "fallo" };
}
