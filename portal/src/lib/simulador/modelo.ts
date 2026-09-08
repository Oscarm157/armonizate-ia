// Llamada al modelo. Prompt y modelo se copian literales del pipeline ya calibrado
// (scripts/10_simular.py del repo armonizate-simulador). No se improvisan aquí.

const API = "https://api.replicate.com/v1";

// Se compararon nano-banana pro, 2 y 2-lite con el mismo prompt sobre los mismos
// casos: el 2 deja el contorno de la cabeza más limpio, es el que menos toca el
// rostro y tarda unos 12 s contra 40 del pro.
const MODELO = "google/nano-banana-2";

/**
 * Texto final, el que Oscar validó a ojo contra los casos reales. Se copia literal y no
 * se "mejora" sin volver a medir contra el holdout, porque cada frase se ganó probando:
 *
 * - Pedir "hélix visible" o "conserva el tamaño de la oreja" FRENA la corrección: son
 *   instrucciones que pelean contra el efecto buscado.
 * - Darle pares antes/después de la clínica como referencia visual empeora el
 *   resultado: el modelo se confunde sobre cuál imagen editar.
 * - Lo que sí funciona es el criterio geométrico, que el modelo puede verificar solo.
 */
export const PROMPT = `Esta persona tiene las orejas muy separadas de la cabeza. Aplícale una otoplastia. Cómo verificarlo: mide el ancho total de la cabeza a la altura de las orejas. En la foto original ese ancho lo marcan las orejas abiertas. En tu resultado ese ancho debe reducirse de forma notable y quedar marcado por el cráneo, no por las orejas. El contorno de la cabeza tiene que ser una curva continua de la sien a la mandíbula, sin nada sobresaliendo a los lados. Si al terminar todavía se distingue el borde de una oreja por fuera de esa curva, está mal: métela más. Todo lo demás queda exactamente igual: mismo rostro y facciones, misma piel con su textura, mismas cejas, misma expresión, mismo peinado, misma diadema, misma ropa, mismo fondo, misma iluminación, mismo encuadre, mismo tamaño de cabeza. No retoques la piel, no suavices, no embellezcas, no hagas zoom, no reencuadres.`;

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
  token: string
): Promise<{ base64: string } | { error: string }> {
  const crear = await fetch(`${API}/models/${MODELO}/predictions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        prompt: PROMPT,
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
