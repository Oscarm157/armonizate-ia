import { eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { db } from "@/lib/db";
import { simulaciones } from "@/lib/schema";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Sirve la foto de una simulación.
 *
 * Las fotos viven en un store privado, así que no son accesibles por URL: se leen con
 * el token del servidor y solo después de comprobar sesión. El acceso es compartido,
 * así que cualquier sesión válida ve todas.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; cual: string }> }
) {
  const me = await getCurrentUser();
  if (!me) return new Response("No autorizado.", { status: 401 });

  const { id, cual } = await params;
  if (cual !== "antes" && cual !== "despues") return new Response("No encontrada.", { status: 404 });

  const filas = await db.select().from(simulaciones).where(eq(simulaciones.id, id));
  const fila = filas[0];
  if (!fila) return new Response("No encontrada.", { status: 404 });

  const pathname = cual === "antes" ? fila.antesPathname : fila.despuesPathname;
  if (!pathname) return new Response("Sin imagen.", { status: 404 });

  const archivo = await get(pathname, { access: "private" });
  if (!archivo?.stream) return new Response("No disponible.", { status: 502 });

  return new Response(archivo.stream, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `inline; filename="${cual}.jpg"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
