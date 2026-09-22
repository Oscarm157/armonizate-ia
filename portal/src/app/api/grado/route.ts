import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { canSimular } from "@/lib/permissions";
import { serverEnv } from "@/lib/env";
import { parseJson } from "@/lib/validate";
import { cajasOrejas } from "@/lib/simulador/clasificar";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  cabeza: z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/, "Imagen inválida."),
});

/**
 * Devuelve dónde están las orejas; el navegador mide con eso cuánto se separan y
 * sugiere el grado. No cuenta contra el tope mensual: cuesta una fracción de centavo y
 * no genera imagen. Sí exige sesión y BotID, porque llama a un servicio de pago.
 */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me || !canSimular(me.role)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    if ((await checkBotId()).isBot) return NextResponse.json({ error: "Bloqueado." }, { status: 403 });
  } catch (e) {
    if (process.env.VERCEL) throw e;
  }

  let datos: z.infer<typeof bodySchema>;
  try {
    datos = await parseJson(bodySchema, request);
  } catch {
    return NextResponse.json({ error: "Imagen inválida." }, { status: 400 });
  }

  const { REPLICATE_API_TOKEN } = serverEnv();
  if (!REPLICATE_API_TOKEN) return NextResponse.json({ cajas: null });

  return NextResponse.json({ cajas: await cajasOrejas(datos.cabeza, REPLICATE_API_TOKEN) });
}
