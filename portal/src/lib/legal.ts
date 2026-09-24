/**
 * El aviso. Uno solo, usado en los cuatro lugares donde el paciente puede verlo: la
 * página del enlace, la demo, la pantalla del ejecutivo y el pie impreso en las imágenes.
 *
 * Está redactado para que nadie pueda volver después con la imagen diciendo "me
 * prometieron esto": dice que no es un resultado comprometido y que no puede exigirse
 * como tal. Es texto revisado por la clínica, no se edita sin su visto bueno.
 */
export const LEGAL_CUERPO =
  "Esta imagen es solo una referencia visual creada con inteligencia artificial. No " +
  "representa un resultado garantizado ni comprometido. Cada oreja es única y responde " +
  "de forma distinta al procedimiento, por lo que el resultado real varía en cada " +
  "persona según su anatomía. La simulación no puede exigirse como resultado final ni " +
  "usarse como base para reclamos sobre el resultado. Los médicos de Clínica Armonízate " +
  "siempre realizan el procedimiento de la forma más profesional posible para lograr el " +
  "mejor resultado en cada oreja.";

/** El mismo aviso impreso en las imágenes que se descargan y se reenvían. */
export const LEGAL_IMAGEN = LEGAL_CUERPO;

/**
 * El mismo aviso, dicho al ejecutivo: en su pantalla no es un descargo legal, es lo que
 * tiene que decirle al paciente al entregarle la simulación.
 */
export const LEGAL_EJECUTIVO_TITULO = "Recuérdale al paciente que es una simulación, no una promesa de resultado.";

export const LEGAL_EJECUTIVO_CUERPO =
  "Dile que la imagen se generó con inteligencia artificial y que es solo una referencia visual: " +
  "cada oreja es única y responde distinto, así que el resultado real varía según su anatomía. " +
  "La simulación no se puede exigir como resultado final. La valoración la hace el médico.";
