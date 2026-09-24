/** Lo que vive un enlace desde que se crea o se reactiva. */
export const HORAS_VIGENCIA = 24;

/**
 * Token del enlace público.
 *
 * Es el único secreto que protege la fotografía de un paciente servida sin sesión, pero
 * también es lo que el ejecutivo pega en WhatsApp, así que se buscó el mínimo que siga
 * siendo inatacable: 9 bytes son 12 caracteres y 72 bits, 4.7 × 10²¹ combinaciones. Con
 * 10,000 enlaces vivos y alguien probando mil por segundo durante las 24 horas que dura
 * uno, la probabilidad de acertar cualquiera es del orden de 2 × 10⁻¹⁰.
 *
 * Si los enlaces dejan de caducar a las 24 horas, este número se vuelve a revisar.
 *
 * Un uuid no sirve aquí: es identificador, no secreto, y parte de sus bits son
 * predecibles.
 */
export function nuevoToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return Buffer.from(bytes).toString("base64url");
}

export function venceEn(horas = HORAS_VIGENCIA): Date {
  return new Date(Date.now() + horas * 60 * 60 * 1000);
}
