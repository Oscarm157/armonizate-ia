"use client";

// Detección de puntos de la cara, en el navegador. El pipeline de imagen corre aquí y
// no en el servidor: MediaPipe está hecho para el navegador y en serverless habría que
// emular canvas. Además el cómputo lo pone el equipo del vendedor.

import type { FaceLandmarker as TFaceLandmarker } from "@mediapipe/tasks-vision";

export type Punto = { x: number; y: number };

/**
 * Puntos que no se mueven con el procedimiento ni con la expresión: ojos, nariz y
 * entrecejo. Son los que se usan para alinear. Nada de boca (cambia con la expresión)
 * ni de óvalo lateral, que es justo lo que el modelo modifica.
 */
export const RIGIDOS = [33, 133, 362, 263, 1, 4, 6, 168, 8, 9, 197, 195];

export const LATERAL_IZQ = 234;
export const LATERAL_DER = 454;
export const CEJA_IZQ = 46;
export const CEJA_DER = 276;
export const FRENTE = 10;
export const MENTON = 152;
export const NARIZ_BASE = 2;
export const OJO_INT_IZQ = 133;
export const OJO_INT_DER = 362;

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODELO =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let promesa: Promise<TFaceLandmarker> | null = null;

/** El modelo pesa unos MB; se carga una vez por sesión de navegador. */
export function cargarDetector(): Promise<TFaceLandmarker> {
  if (!promesa) {
    promesa = (async () => {
      const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM);
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODELO },
        runningMode: "IMAGE",
        numFaces: 1,
      });
    })();
  }
  return promesa;
}

/** Puntos en píxeles de la imagen, o null si no se ve una cara. */
export async function detectar(img: HTMLImageElement | HTMLCanvasElement): Promise<Punto[] | null> {
  const detector = await cargarDetector();
  const res = detector.detect(img);
  const pts = res.faceLandmarks?.[0];
  if (!pts) return null;
  const ancho = "naturalWidth" in img ? img.naturalWidth : img.width;
  const alto = "naturalHeight" in img ? img.naturalHeight : img.height;
  return pts.map((p) => ({ x: p.x * ancho, y: p.y * alto }));
}

export function cargarImagen(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo abrir la imagen."));
    img.src = src;
  });
}
