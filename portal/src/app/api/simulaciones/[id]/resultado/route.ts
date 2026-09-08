import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { z } from "zod";
import { db } from "@/lib/db";
import { simulaciones } from "@/lib/schema";
import { getCurrentUser } from "@/lib/session";
import { parseJson } from "@/lib/validate";

export const runtime = "nodejs";

const JPEG = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;

const bodySchema = z.object({
  imagen: z.string().regex(JPEG, "Imagen inválida."),
  pieza: z.string().regex(JPEG).optional(),
  comparativa: z.string().regex(JPEG).optional(),
});

function aFile(dataUrl: string, nombre: string): File {
  return new File([Buffer.from(dataUrl.split(",")[1], "base64")], nombre, { type: "image/jpeg" });
}

/**
 * Guarda lo que se armó en el navegador: la simulación limpia y las dos piezas con el
 * logo y el aviso impresos.
 *
 * Las piezas se guardan y no se rearman al vuelo porque son lo que de verdad vio el
 * paciente. Antes se perdían al cerrar la pestaña y no quedaba constancia de con qué
 * aviso se entregó cada caso.
 */
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

  const subir = (dataUrl: string, nombre: string) =>
    put(`simulaciones/${me.id}/${nombre}.jpg`, aFile(dataUrl, `${nombre}.jpg`), {
      access: "private",
      addRandomSuffix: true,
    });

  const [despues, pieza, comparativa] = await Promise.all([
    subir(datos.imagen, "despues"),
    datos.pieza ? subir(datos.pieza, "pieza") : null,
    datos.comparativa ? subir(datos.comparativa, "comparativa") : null,
  ]);

  await db
    .update(simulaciones)
    .set({
      despuesUrl: despues.url,
      despuesPathname: despues.pathname,
      ...(pieza && { piezaUrl: pieza.url, piezaPathname: pieza.pathname }),
      ...(comparativa && {
        comparativaUrl: comparativa.url,
        comparativaPathname: comparativa.pathname,
      }),
    })
    .where(eq(simulaciones.id, id));

  return NextResponse.json({ ok: true });
}
