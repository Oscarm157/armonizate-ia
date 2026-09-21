/** Nombre con el que aparece lo generado antes de que existieran los ejecutivos. */
export const SIN_EJECUTIVO = "Administración";

// Tonos pastel para distinguir a cada ejecutivo en el historial de un vistazo.
const PASTELES = [
  { fondo: "#dbeafe", texto: "#1e3a8a" },
  { fondo: "#dcfce7", texto: "#14532d" },
  { fondo: "#fef3c7", texto: "#78350f" },
  { fondo: "#fce7f3", texto: "#831843" },
  { fondo: "#e0e7ff", texto: "#312e81" },
  { fondo: "#ccfbf1", texto: "#134e4a" },
  { fondo: "#ffedd5", texto: "#7c2d12" },
  { fondo: "#f3e8ff", texto: "#581c87" },
];
const GRIS = { fondo: "#eceaf2", texto: "#4a4a63" };

/** El color de un ejecutivo, estable por su id. Sin ejecutivo, gris. */
export function colorEjecutivo(id: string | null) {
  if (!id) return GRIS;
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PASTELES[h % PASTELES.length];
}
