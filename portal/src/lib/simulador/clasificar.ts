// Máscara de las orejas de la foto, para medir cuánto se separan de la cabeza.
// Un modelo de visión que "opina" el grado coincidió con Oscar en 5 de 17 casos; medir
// la distancia de la punta de la oreja al borde de la cara coincidió en 15 de 17
// (calibrado el 2026-09-21). La medición se hace en el navegador (medir.ts).

import { correrVersion } from "./replicate";

// grounded_sam: Grounding DINO + Segment Anything. Versión fija: el cálculo depende de
// que la tercera salida sea la máscara en blanco y negro.
const SEGMENTADOR = "ee871c19efb1941f55f66a3d7d960428c8a5afcb77449547fe8e5a3ab9ebc21c";

export async function mascaraOrejas(imagenDataUrl: string, token: string): Promise<string | null> {
  const r = await correrVersion(
    SEGMENTADOR,
    { image: imagenDataUrl, mask_prompt: "ear", negative_mask_prompt: "sky" },
    token,
    "grado"
  );
  if ("error" in r || !Array.isArray(r.output) || typeof r.output[2] !== "string") return null;
  const img = await fetch(r.output[2]);
  if (!img.ok) return null;
  return `data:image/png;base64,${Buffer.from(await img.arrayBuffer()).toString("base64")}`;
}
