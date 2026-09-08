/**
 * Qué tan separadas de la cabeza vienen las orejas del paciente.
 *
 * Lo elige el asesor mirando la foto, no lo calcula el programa: MediaPipe no tiene
 * landmarks de oreja (234 y 454 son el borde lateral de la cara), así que cualquier
 * medida sería un proxy indirecto, y equivocarse en el proxy es aplicarle a un paciente
 * la corrección de otro.
 *
 * Vive en su propio archivo, sin dependencias, porque lo usan a la vez el cliente y el
 * servidor: `modelo.ts` arrastra la llamada a Replicate y no debe entrar al navegador.
 */
export type Grado = "alto" | "medio" | "bajo";

export const GRADOS: { valor: Grado; titulo: string; pie: string }[] = [
  { valor: "alto", titulo: "Grado alto", pie: "Se ven completas de frente" },
  { valor: "medio", titulo: "Grado medio", pie: "Se nota la separación, es el caso más común" },
  { valor: "bajo", titulo: "Grado bajo", pie: "Apenas se separan de la cabeza" },
];
