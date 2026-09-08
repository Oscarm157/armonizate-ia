import { put } from "@vercel/blob";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Subida de imagen a Vercel Blob con validación de tipo y tamaño.
// Requiere BLOB_READ_WRITE_TOKEN en el entorno.
export async function uploadImage(
  prefix: string,
  file: File
): Promise<{ url: string; pathname: string } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "No se recibió archivo." };
  if (!file.type.startsWith("image/")) return { error: "El archivo debe ser una imagen." };
  if (file.size > MAX_IMAGE_BYTES) return { error: "La imagen supera 8MB." };
  const blob = await put(`${prefix}/${file.name}`, file, { access: "public", addRandomSuffix: true });
  return { url: blob.url, pathname: blob.pathname };
}
