import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { z } from "zod";
import { db } from "@/lib/db";
import { simulaciones } from "@/lib/schema";
import { getCurrentUser } from "@/lib/session";
import { parseJson } from "@/lib/validate";

export const runtime = "nodejs";

const bodySchema = z.object({
  imagen: z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/, "Imagen inválida."),
});

/** Guarda el resultado ya compuesto en el navegador. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await params;

  let datos: z.infer<typeof bodySchema>;
  try {
    datos = await parseJson(bodySchema, request);
  } catch {
    return NextResponse.json({ error: "Imagen inválida." }, { status: 400 });
  }

  // El id viene del cliente, así que la fila se carga de la base filtrando por dueño.
  const filas = await db
    .select({ id: simulaciones.id })
    .from(simulaciones)
    .where(and(eq(simulaciones.id, id), eq(simulaciones.userId, me.id)));
  if (!filas[0]) return NextResponse.json({ error: "No encontrada." }, { status: 404 });

  const datosB64 = datos.imagen.split(",")[1];
  const archivo = new File([Buffer.from(datosB64, "base64")], "despues.jpg", { type: "image/jpeg" });
  const blob = await put(`simulaciones/${me.id}/despues.jpg`, archivo, {
    access: "private",
    addRandomSuffix: true,
  });

  await db
    .update(simulaciones)
    .set({ despuesUrl: blob.url, despuesPathname: blob.pathname })
    .where(eq(simulaciones.id, id));

  return NextResponse.json({ ok: true });
}
