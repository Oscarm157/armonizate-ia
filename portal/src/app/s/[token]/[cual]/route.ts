import { get } from "@vercel/blob";
import { porToken } from "@/lib/datos";

export const runtime = "nodejs";

/**
 * Sirve las imágenes del enlace público.
 *
 * La vigencia se comprueba aquí también, en cada petición: si la página caducara pero
 * las imágenes se siguieran sirviendo, el enlace no caducaría de verdad y la fotografía
 * del paciente quedaría accesible para siempre.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string; cual: string }> }
) {
  const { token, cual } = await params;
  if (cual !== "antes" && cual !== "simulacion") return new Response("No encontrada.", { status: 404 });

  const sim = await porToken(token);
  if (!sim) return new Response("El enlace ya no está disponible.", { status: 410 });

  const pathname = cual === "antes" ? sim.antesPathname : sim.despuesPathname;
  if (!pathname) return new Response("Sin imagen.", { status: 404 });

  const archivo = await get(pathname, { access: "private" });
  if (!archivo?.stream) return new Response("No disponible.", { status: 502 });

  return new Response(archivo.stream, {
    headers: {
      "Content-Type": "image/jpeg",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "private, no-store",
    },
  });
}
