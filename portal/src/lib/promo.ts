/**
 * La promoción que acompaña al enlace del paciente.
 *
 * Sin dependencias a propósito: lo importan a la vez la página (servidor) y el bloque de
 * la cuenta atrás (cliente), igual que `enlace.ts`.
 */

/** Precio de lista del procedimiento, en pesos. */
export const PRECIO_LISTA = 21990;

export const DESCUENTO = 0.1;

export function precioConDescuento(): number {
  return Math.round(PRECIO_LISTA * (1 - DESCUENTO));
}

const pesos = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function fmtPesos(n: number): string {
  return pesos.format(n);
}

/**
 * Milisegundos que le quedan a la promoción.
 *
 * Vive aquí y no en la página porque leer el reloj durante el render de un componente
 * es una llamada impura y el linter la rechaza, con razón.
 */
export function msRestantes(expiraEn: Date | string): number {
  return Math.max(0, new Date(expiraEn).getTime() - Date.now());
}

/**
 * Código de la promoción, sacado del folio de la simulación.
 *
 * Es determinista, así que no hace falta ni tabla ni columna nueva, y desde el código
 * que el paciente presenta en la clínica se puede volver a la simulación que lo generó.
 * Seis caracteres y no cuatro: con cuatro son 65 mil combinaciones y al volumen previsto
 * dos pacientes acabarían compartiendo código en unos meses.
 */
export function codigoDescuento(id: string): string {
  return `ARM-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
