// Llamada al modelo. Prompt y modelo se copian literales del pipeline ya calibrado
// (scripts/10_simular.py del repo armonizate-simulador). No se improvisan aquí.

import type { Grado } from "./grado";

const API = "https://api.replicate.com/v1";

// Se compararon nano-banana pro, 2 y 2-lite con el mismo prompt sobre los mismos
// casos: el 2 deja el contorno de la cabeza más limpio, es el que menos toca el
// rostro y tarda unos 12 s contra 40 del pro.
export const MODELO = "google/nano-banana-2";

/**
 * Lo que no cambia entre grados: es lo que impide que el modelo aproveche el viaje para
 * suavizar la piel, redibujar las cejas o reencuadrar.
 */
const COLA = `Todo lo demás queda exactamente igual: mismo rostro y facciones, misma piel con su textura, mismas cejas, misma expresión, mismo peinado, misma diadema, misma ropa, mismo fondo, misma iluminación, mismo encuadre, mismo tamaño de cabeza. No retoques la piel, no suavices, no embellezcas, no hagas zoom, no reencuadres.`;

/**
 * Un prompt por grado. Lo único que cambia es el objetivo; el método de verificación
 * (medir el ancho de la cabeza a la altura de las orejas) es el mismo en los tres,
 * porque es lo que el modelo puede comprobar solo y lo que hace que funcione.
 *
 * Lo aprendido calibrando, que sigue vigente:
 *
 * - Pedir "hélix visible" o "conserva el tamaño de la oreja" FRENA la corrección hasta
 *   dejarla en nada: son instrucciones que pelean contra el efecto buscado. Por eso en
 *   los grados alto y medio el permiso de que la oreja se vea va escrito como resultado
 *   geométrico, y acompañado de una condición de fallo, nunca como "consérvala".
 * - Darle pares antes/después de la clínica como referencia visual empeora el
 *   resultado: el modelo se confunde sobre cuál imagen editar.
 *
 * El de grado bajo es el texto que estuvo en producción, copiado sin tocar una coma.
 * Su resultado (oreja prácticamente pegada) es el correcto para este grado; comparado
 * contra los casos reales de la clínica, era el error en los otros dos.
 */
export const PROMPTS: Record<Grado, string> = {
  alto: `Esta persona tiene las orejas muy separadas de la cabeza. Aplícale una otoplastia. Cómo verificarlo: mide el ancho total de la cabeza a la altura de las orejas. En la foto original ese ancho lo marcan las orejas abiertas. En tu resultado ese ancho debe reducirse de forma clara: de lo que la oreja sobresalía del cráneo tiene que quedar más o menos la mitad. La oreja queda recogida hacia atrás y sigue viéndose por fuera del contorno del cráneo, mucho menos abierta que en el original. Si la oreja quedó invisible de frente o escondida detrás de la cabeza, está mal: es demasiada corrección. Si sigue tan abierta como en el original, también está mal: métela más. ${COLA}`,

  medio: `Esta persona tiene las orejas separadas de la cabeza. Aplícale una otoplastia. Cómo verificarlo: mide el ancho total de la cabeza a la altura de las orejas. En la foto original ese ancho lo marcan las orejas abiertas. En tu resultado ese ancho debe reducirse de forma notable: de lo que la oreja sobresalía del cráneo tiene que quedar más o menos un tercio. El contorno de la cabeza queda casi como una curva continua de la sien a la mandíbula, con el borde de la oreja asomando apenas. Si la oreja sigue tan abierta como en el original, está mal: métela más. ${COLA}`,

  bajo: `Esta persona tiene las orejas muy separadas de la cabeza. Aplícale una otoplastia. Cómo verificarlo: mide el ancho total de la cabeza a la altura de las orejas. En la foto original ese ancho lo marcan las orejas abiertas. En tu resultado ese ancho debe reducirse de forma notable y quedar marcado por el cráneo, no por las orejas. El contorno de la cabeza tiene que ser una curva continua de la sien a la mandíbula, sin nada sobresaliendo a los lados. Si al terminar todavía se distingue el borde de una oreja por fuera de esa curva, está mal: métela más. ${COLA}`,
};

type Prediccion = {
  id: string;
  status: string;
  output?: string | string[];
  error?: unknown;
};

/**
 * Genera la simulación y devuelve la imagen en base64.
 *
 * A 1K, que es el default del modelo, la salida se ve borrosa al componerla sobre la
 * foto original, que suele ser más grande. Por eso 2K.
 */
export async function generar(
  imagenDataUrl: string,
  grado: Grado,
  token: string
): Promise<{ base64: string } | { error: string }> {
  const crear = await fetch(`${API}/models/${MODELO}/predictions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        prompt: PROMPTS[grado],
        image_input: [imagenDataUrl],
        output_format: "jpg",
        aspect_ratio: "match_input_image",
        resolution: "2K",
      },
    }),
  });

  if (!crear.ok) {
    const detalle = (await crear.text()).slice(0, 300);
    console.error("[simular] Replicate HTTP", crear.status, detalle);
    return { error: "El servicio de imagen no respondió. Intenta de nuevo." };
  }

  let pred: Prediccion = await crear.json();
  for (let i = 0; i < 60 && (pred.status === "starting" || pred.status === "processing"); i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const poll = await fetch(`${API}/predictions/${pred.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!poll.ok) break;
    pred = await poll.json();
  }

  if (pred.status !== "succeeded") {
    console.error("[simular] predicción", pred.status, String(pred.error).slice(0, 200));
    return { error: "No se pudo generar la simulación. Prueba con otra foto de frente." };
  }

  const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  if (!url) return { error: "El servicio devolvió una respuesta vacía." };

  const img = await fetch(url);
  if (!img.ok) return { error: "No se pudo descargar la imagen generada." };
  const buf = Buffer.from(await img.arrayBuffer());
  return { base64: buf.toString("base64") };
}
