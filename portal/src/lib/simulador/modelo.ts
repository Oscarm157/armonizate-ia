// Llamada al modelo. Prompt y modelo se copian literales del pipeline ya calibrado
// (scripts/10_simular.py del repo armonizate-simulador). No se improvisan aquí.

import type { Grado } from "./grado";
import { correr } from "./replicate";

// Se compararon nano-banana pro, 2 y 2-lite con el mismo prompt sobre los mismos
// casos: el 2 deja el contorno de la cabeza más limpio, es el que menos toca el
// rostro y tarda unos 12 s contra 40 del pro.
export const MODELO = "google/nano-banana-2";

/**
 * La oreja se mueve solo hacia el cráneo. No dice nada de conservar su tamaño ni su
 * forma a propósito: pedir eso frena la corrección hasta dejarla en nada.
 *
 * La altura sí se fija, con dos puntos que el modelo puede comprobar (borde de arriba y
 * lóbulo): en producción salían orejas que subían o bajaban, y eso el procedimiento no
 * lo hace nunca. Probado el 2026-09-21 en 092, 043, 063 y 010 sin frenar la corrección.
 */
const EJE = `La oreja se mueve solo hacia el cráneo, hacia atrás. Su altura no cambia: el borde de arriba de la oreja queda exactamente a la misma altura que en la original, y el lóbulo también. No subas ni bajes la oreja. No aparece ninguna oreja donde el pelo la tapaba.`;

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
 * Ninguno afirma cuánto sobresale la oreja en esta foto concreta. El texto que estuvo en
 * producción abría con "tiene las orejas muy separadas de la cabeza", y en una foto donde
 * no lo están el modelo se inventaba una oreja abierta para poder corregirla: la
 * redibujaba y la corría de altura. La severidad la fija el grado, no una afirmación
 * sobre la fotografía.
 */
export const PROMPTS: Record<Grado, string> = {
  // Cada grado describe cómo se ve la oreja AL TERMINAR, no qué proporción de lo
  // original queda: con proporciones, un grado mal elegido dejaba la foto casi igual.
  // Las metas salen de los resultados reales de la clínica, que pegan la oreja más de
  // lo que se pedía antes, incluso en casos graves. Calibrado el 2026-09-21 con 24
  // generaciones contra los casos apartados y los leves 072 y 100 de Oscar.
  bajo: `Aplícale a esta persona una otoplastia. RESULTADO EXIGIDO: vistas de frente, las orejas quedan recogidas hacia atrás, casi de perfil respecto a la cámara y pegadas al cráneo: de cada oreja solo asoma una franja estrecha, más o menos una décima parte de la oreja, por fuera del contorno de la cabeza. Cómo verificarlo: mide el ancho total de la cabeza a la altura de las orejas y compáralo con la original. En tu resultado ese ancho lo marca casi solo el cráneo. La cabeza conserva su forma y su ancho natural: no la recortes ni la estreches. Si la oreja desapareció por completo o la cabeza se ve recortada a los lados, está mal: es demasiada corrección. Si de la oreja asoma más que una franja estrecha, también está mal: pégala más. ${EJE} ${COLA}`,

  medio: `Aplícale a esta persona una otoplastia. RESULTADO EXIGIDO: de frente las orejas se siguen viendo, pero claramente recogidas hacia atrás y cerca del cráneo: de cada oreja asoma solo una franja delgada, más o menos una sexta parte de la oreja, por fuera del contorno de la cabeza. Cómo verificarlo: mide el ancho total de la cabeza a la altura de las orejas y compáralo con la original. En tu resultado ese ancho se reduce de forma notable, y el contorno de la cabeza queda casi como una curva continua de la sien a la mandíbula. Si la oreja sigue tan abierta como en la original, está mal: métela más. Si la oreja desapareció por completo, también está mal. ${EJE} ${COLA}`,

  alto: `Aplícale a esta persona una otoplastia. RESULTADO EXIGIDO: la corrección más fuerte que permite una otoplastia sin esconder la oreja: queda recogida hacia atrás, pegada al cráneo, y de frente asoma solo una franja delgada, más o menos una sexta parte de la oreja, por fuera del contorno de la cabeza. Cómo verificarlo: mide el ancho total de la cabeza a la altura de las orejas y compáralo con la original. En tu resultado ese ancho se reduce de forma muy notable. Si la oreja todavía se ve abierta hacia los lados, está mal: métela más. Si la oreja desapareció por completo, también está mal. ${EJE} ${COLA}`,
};

/**
 * La segunda opción, cuando la primera se quedó corta. Pedir "más fuerza" con la misma
 * meta no cambiaba nada (probado el 2026-09-21), así que la segunda sube un escalón de
 * meta: medio y grave piden lo del leve, que es la corrección más pegada.
 */
const MAS_FUERZA = `Esta es una segunda versión: la anterior se quedó corta. Aplica la corrección con más fuerza que la primera vez.`;

export const PROMPTS_FUERTE: Record<Grado, string> = {
  bajo: `${MAS_FUERZA} ${PROMPTS.bajo}`,
  medio: `${MAS_FUERZA} ${PROMPTS.bajo}`,
  alto: `${MAS_FUERZA} ${PROMPTS.bajo}`,
};

/**
 * Genera la simulación y devuelve la imagen en base64.
 *
 * A 1K, que es el default del modelo, la salida se ve borrosa al componerla sobre la
 * foto original, que suele ser más grande. Por eso 2K.
 *
 * `fuerte` usa la versión con más empuje del mismo grado: es la que corre cuando el
 * ejecutivo pide otra opción porque la primera se quedó corta. Repetir el mismo prompt
 * casi nunca mejoraba.
 */
export async function generar(
  imagenDataUrl: string,
  grado: Grado,
  token: string,
  fuerte = false
): Promise<{ base64: string } | { error: string }> {
  const r = await correr(
    MODELO,
    {
      prompt: (fuerte ? PROMPTS_FUERTE : PROMPTS)[grado],
      image_input: [imagenDataUrl],
      output_format: "jpg",
      aspect_ratio: "match_input_image",
      resolution: "2K",
    },
    token,
    "simular"
  );
  if ("error" in r)
    return {
      error:
        r.error === "http"
          ? "El servicio de imagen no respondió. Intente de nuevo."
          : "No se pudo generar la simulación. Pruebe con otra foto de frente.",
    };

  const url = Array.isArray(r.output) ? r.output[0] : r.output;
  if (typeof url !== "string") return { error: "El servicio devolvió una respuesta vacía." };

  const img = await fetch(url);
  if (!img.ok) return { error: "No se pudo descargar la imagen generada." };
  const buf = Buffer.from(await img.arrayBuffer());
  return { base64: buf.toString("base64") };
}
