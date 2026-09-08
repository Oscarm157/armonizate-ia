/** Lo que vive un enlace desde que se crea o se reactiva. */
export const HORAS_VIGENCIA = 24;

/**
 * Token del enlace público.
 *
 * Es el único secreto que protege la fotografía de un paciente servida sin sesión, así
 * que se generan 32 bytes aleatorios. Un uuid no sirve aquí: es identificador, no
 * secreto, y parte de sus bits son predecibles.
 */
export function nuevoToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

export function venceEn(horas = HORAS_VIGENCIA): Date {
  return new Date(Date.now() + horas * 60 * 60 * 1000);
}
