/**
 * El aviso. Uno solo, usado en los tres lugares donde el paciente puede verlo: la
 * página del enlace, las imágenes descargables y la pantalla del asesor.
 *
 * Está redactado para que nadie pueda volver después con la imagen diciendo "me
 * prometieron esto". Por eso encabeza diciendo lo que NO es, antes de explicar qué es.
 */
export const LEGAL_TITULO = "Esto es una simulación, no una promesa de resultado.";

export const LEGAL_CUERPO =
  "La imagen fue generada con inteligencia artificial a partir de su fotografía y sirve " +
  "como orientación de cómo podría verse el procedimiento. El resultado real depende de " +
  "la anatomía de cada persona y puede variar. La valoración la realiza el médico.";

/**
 * El mismo aviso, dicho al ejecutivo: en su pantalla no es un descargo legal, es lo que
 * tiene que decirle al paciente al entregarle la simulación.
 */
export const LEGAL_EJECUTIVO_TITULO = "Recuérdale al paciente que es una simulación, no una promesa de resultado.";

export const LEGAL_EJECUTIVO_CUERPO =
  "Dile que la imagen se generó con inteligencia artificial a partir de su fotografía y que sirve " +
  "como orientación de cómo podría verse el procedimiento. El resultado real depende de la anatomía " +
  "de cada persona y puede variar, y la valoración la realiza el médico.";

/** El aviso impreso en las imágenes que se descargan y se reenvían (texto de la clínica). */
export const LEGAL_IMAGEN =
  "La imagen fue generada con inteligencia artificial a partir de su fotografía y sirve " +
  "como orientación de cómo podría verse el procedimiento. El resultado real depende de " +
  "la anatomía de cada persona y puede variar.";
