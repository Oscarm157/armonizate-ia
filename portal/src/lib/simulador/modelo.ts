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
  alto: `Acerca las orejas de esta persona a la cabeza con una otoplastia. Cómo verificarlo: mide el ancho total de la cabeza a la altura de las orejas. En tu resultado ese ancho debe reducirse de forma clara: de lo que la oreja sobresalía del cráneo tiene que quedar más o menos la mitad. La oreja queda recogida hacia atrás y sigue viéndose por fuera del contorno del cráneo, mucho menos abierta que en el original. Si la oreja quedó invisible de frente o escondida detrás de la cabeza, está mal: es demasiada corrección. Si sigue tan abierta como en el original, también está mal: métela más. ${EJE} ${COLA}`,

  medio: `Acerca las orejas de esta persona a la cabeza con una otoplastia. Cómo verificarlo: mide el ancho total de la cabeza a la altura de las orejas. En tu resultado ese ancho debe reducirse de forma notable: de lo que la oreja sobresalía del cráneo tiene que quedar más o menos un tercio. El contorno de la cabeza queda casi como una curva continua de la sien a la mandíbula, con el borde de la oreja asomando apenas. Si la oreja sigue tan abierta como en el original, está mal: métela más. ${EJE} ${COLA}`,

  // Casos leves: la meta es que la oreja apenas asome, un borde delgado pegado al
  // cráneo. Una primera versión pedía que no se viera nada y dejaba la cabeza como
  // recortada a los lados; esta tiene condición de fallo en las dos direcciones.
  // Probado el 2026-09-21 en 092 (dos corridas, salen parecidas) y 043.
  bajo: `Aplícale a esta persona una otoplastia. RESULTADO EXIGIDO: de frente, las orejas quedan pegadas al cráneo y apenas asoman: solo se ve un borde delgado de cada oreja junto al contorno de la cabeza. Cómo verificarlo: mide el ancho total de la cabeza a la altura de las orejas. En tu resultado ese ancho lo marca el cráneo más ese borde delgado de la oreja. La cabeza conserva su forma y su ancho natural: no la recortes, no la estreches, no borres las orejas. Si la oreja desapareció por completo o la cabeza se ve recortada a los lados, está mal: es demasiada corrección. Si la oreja todavía sale claramente del contorno, también está mal: pégala más. ${EJE} ${COLA}`,
};

/**
 * La versión con más empuje de cada grado: misma meta, un escalón más de corrección.
 */
const MAS_FUERZA = `Esta es una segunda versión: la anterior se quedó corta. Aplica la corrección con más fuerza que la primera vez, llevando la oreja más cerca del cráneo dentro de lo que pide el resultado.`;

export const PROMPTS_FUERTE: Record<Grado, string> = {
  bajo: `${MAS_FUERZA} ${PROMPTS.bajo}`,
  medio: `${MAS_FUERZA} ${PROMPTS.medio}`,
  alto: `${MAS_FUERZA} ${PROMPTS.alto}`,
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
