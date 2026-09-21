// Sugiere el grado del caso mirando la foto. El ejecutivo lo puede cambiar: es una
// preselección, no una decisión. Si el servicio falla, se sigue sin sugerencia.

import type { Grado } from "./grado";
import { correr } from "./replicate";

export const MODELO_GRADO = "google/gemini-3-flash";

// Texto calibrado contra la clasificación de Oscar de los 15 casos apartados
// (armonizate-simulador/dataset/grados_oscar.json).
export const PROMPT_GRADO = `Mira esta foto de frente de una persona. Evalúa solo cuánto se separan sus orejas de la cabeza, vistas de frente.
- leve: las orejas apenas se separan; se ve poco de ellas por fuera del contorno de la cabeza.
- medio: se nota la separación; se ve buena parte de la oreja por fuera del contorno.
- grave: las orejas se ven casi completas de frente, muy abiertas hacia los lados.
Responde solo una palabra: leve, medio o grave.`;

const A_GRADO: Record<string, Grado> = { leve: "bajo", medio: "medio", grave: "alto" };

export async function sugerirGrado(imagenDataUrl: string, token: string): Promise<Grado | null> {
  const r = await correr(
    MODELO_GRADO,
    { images: [imagenDataUrl], prompt: PROMPT_GRADO, temperature: 0, max_output_tokens: 20 },
    token,
    "grado"
  );
  if ("error" in r) return null;
  const texto = (Array.isArray(r.output) ? r.output.join("") : String(r.output ?? "")).toLowerCase();
  const palabra = texto.match(/leve|medio|grave/)?.[0];
  return palabra ? A_GRADO[palabra] : null;
}
