import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { canSimular } from "@/lib/permissions";
import { consumoDelMes, TOPE_MENSUAL } from "@/lib/datos";
import { serverEnv } from "@/lib/env";
import { parseJson } from "@/lib/validate";
import { iniciarCajas } from "@/lib/simulador/clasificar";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  cabeza: z.string().regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/, "Imagen inválida."),
});

/**
 * Arranca la ubicación de las orejas y devuelve el id; el navegador consulta
 * /api/grado/[id] hasta tener las cajas, mide con ellas y sugiere el grado. No cuenta contra el tope mensual: cuesta una fracción de centavo y
 * no genera imagen. Sí exige sesión y BotID, porque llama a un servicio de pago.
 *
 * Aunque no consuma cuota, sí respeta el tope: agotado el mes no se puede generar, así que
 * medir la oreja solo gastaría sin servir de nada. Sin esto, la única ruta de pago del portal
 * se queda sin ninguna cota superior de gasto.
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
  if (!REPLICATE_API_TOKEN) return NextResponse.json({ id: null });

  // `id: null` es lo que la UI ya sabe manejar: deja elegir el grado a mano y sigue.
  if ((await consumoDelMes(me.id)) >= TOPE_MENSUAL) return NextResponse.json({ id: null });

  return NextResponse.json({ id: await iniciarCajas(datos.cabeza, REPLICATE_API_TOKEN) });
}
