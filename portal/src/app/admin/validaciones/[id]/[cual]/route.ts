import { eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { db } from "@/lib/db";
import { validaciones } from "@/lib/schema";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/permissions";

export const runtime = "nodejs";

const CAMPOS = { antes: 1, real: 1, simulada: 1 } as const;

/**
 * Sirve las fotografías de un caso de validación.
 *
 * Son fotos de pacientes reales de la clínica usadas para medir la herramienta, así que
 * solo las ve un administrador: ni el vendedor ni el rol de lectura entran aquí.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; cual: string }> }
) {
  const me = await getCurrentUser();
  if (!me || !isAdmin(me.role)) return new Response("No autorizado.", { status: 401 });

  const { id, cual } = await params;
  if (!(cual in CAMPOS)) return new Response("No encontrada.", { status: 404 });

  const filas = await db.select().from(validaciones).where(eq(validaciones.id, id));
  const fila = filas[0];
  if (!fila) return new Response("No encontrada.", { status: 404 });

  const pathname =
    cual === "antes" ? fila.antesPathname : cual === "real" ? fila.realPathname : fila.simuladaPathname;
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
