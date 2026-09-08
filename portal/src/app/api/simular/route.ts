import { NextResponse } from "next/server";
import { checkBotId } from "botid/server";
import { put } from "@vercel/blob";
import { z } from "zod";
import { db } from "@/lib/db";
import { simulaciones } from "@/lib/schema";
import { getCurrentUser } from "@/lib/session";
import { canSimular } from "@/lib/permissions";
import { consumoDelMes, TOPE_MENSUAL } from "@/lib/datos";
import { serverEnv } from "@/lib/env";
import { parseJson } from "@/lib/validate";
import { generar } from "@/lib/simulador/modelo";

export const runtime = "nodejs";
export const maxDuration = 300;

const DATA_URL = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

const bodySchema = z.object({
  // recorte cuadrado de la cabeza, es lo que ve el modelo
  cabeza: z.string().regex(DATA_URL, "Imagen inválida."),
  // foto completa tal como la subió el vendedor, es lo que se guarda
  original: z.string().regex(DATA_URL, "Imagen inválida."),
  prospectoNombre: z.string().trim().min(2, "Falta el nombre del prospecto.").max(80),
  prospectoTelefono: z.string().trim().min(7, "Falta el teléfono.").max(25),
});

function aFile(dataUrl: string, nombre: string): File {
  const [cabecera, datos] = dataUrl.split(",");
  const tipo = cabecera.slice(5, cabecera.indexOf(";"));
  return new File([Buffer.from(datos, "base64")], nombre, { type: tipo });
}

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (!canSimular(me.role))
    return NextResponse.json({ error: "Tu cuenta no puede generar simulaciones." }, { status: 403 });

  const verificacion = await checkBotId();
  if (verificacion.isBot) return NextResponse.json({ error: "Bloqueado." }, { status: 403 });

  let datos: z.infer<typeof bodySchema>;
  try {
    datos = await parseJson(bodySchema, request);
  } catch {
    return NextResponse.json({ error: "Revisa la foto y los datos del prospecto." }, { status: 400 });
  }

  // El tope se verifica ANTES de llamar al modelo: pasado el límite no se gasta.
  const usadas = await consumoDelMes(me.id);
  if (usadas >= TOPE_MENSUAL) {
    return NextResponse.json(
      { error: `Llegaste a tu tope de ${TOPE_MENSUAL} simulaciones este mes.`, usadas, tope: TOPE_MENSUAL },
      { status: 429 }
    );
  }

  const { REPLICATE_API_TOKEN } = serverEnv();
  if (!REPLICATE_API_TOKEN) {
    console.error("[simular] falta REPLICATE_API_TOKEN");
    return NextResponse.json({ error: "El simulador no está configurado." }, { status: 500 });
  }

  // Store privado: la foto de un paciente no debe quedar accesible por URL.
  const antes = await put(`simulaciones/${me.id}/antes.jpg`, aFile(datos.original, "antes.jpg"), {
    access: "private",
    addRandomSuffix: true,
  });

  // La fila se crea antes de llamar al modelo: lo que consume cuota es haber pedido la
  // generación, no haberla terminado.
  const [fila] = await db
    .insert(simulaciones)
    .values({
      userId: me.id,
      prospectoNombre: datos.prospectoNombre,
      prospectoTelefono: datos.prospectoTelefono,
      antesUrl: antes.url,
      antesPathname: antes.pathname,
    })
    .returning({ id: simulaciones.id });

  const res = await generar(datos.cabeza, REPLICATE_API_TOKEN);
  if ("error" in res) return NextResponse.json({ error: res.error, id: fila.id }, { status: 502 });

  return NextResponse.json({
    id: fila.id,
    imagen: `data:image/jpeg;base64,${res.base64}`,
    usadas: usadas + 1,
    tope: TOPE_MENSUAL,
  });
}
