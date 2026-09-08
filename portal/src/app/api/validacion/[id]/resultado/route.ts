import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { z } from "zod";
import { db } from "@/lib/db";
import { validaciones } from "@/lib/schema";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/permissions";
import { parseJson } from "@/lib/validate";

export const runtime = "nodejs";

const bodySchema = z.object({
  imagen: z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/, "Imagen inválida."),
});

/** Guarda la simulación ya compuesta sobre el antes del caso de validación. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me || !isAdmin(me.role)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { id } = await params;

  let datos: z.infer<typeof bodySchema>;
  try {
    datos = await parseJson(bodySchema, request);
  } catch {
    return NextResponse.json({ error: "Imagen inválida." }, { status: 400 });
  }

  const filas = await db.select({ id: validaciones.id }).from(validaciones).where(eq(validaciones.id, id));
  if (!filas[0]) return NextResponse.json({ error: "No encontrada." }, { status: 404 });

  const b64 = datos.imagen.split(",")[1];
  const archivo = new File([Buffer.from(b64, "base64")], "simulada.jpg", { type: "image/jpeg" });
  const blob = await put(`validaciones/simulada.jpg`, archivo, {
    access: "private",
    addRandomSuffix: true,
  });

  await db
    .update(validaciones)
    .set({ simuladaUrl: blob.url, simuladaPathname: blob.pathname })
    .where(eq(validaciones.id, id));

  return NextResponse.json({ ok: true });
}
