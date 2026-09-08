import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { z } from "zod";
import { db } from "@/lib/db";
import { validaciones } from "@/lib/schema";
import { getCurrentUser } from "@/lib/session";
import { isAdmin } from "@/lib/permissions";
import { serverEnv } from "@/lib/env";
import { parseJson } from "@/lib/validate";
import { generar, MODELO } from "@/lib/simulador/modelo";

export const runtime = "nodejs";
export const maxDuration = 300;

const DATA_URL = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

const bodySchema = z.object({
  cabeza: z.string().regex(DATA_URL, "Imagen inválida."),
  antes: z.string().regex(DATA_URL, "Imagen inválida."),
  real: z.string().regex(DATA_URL, "Imagen inválida."),
  etiqueta: z.string().trim().max(80).optional(),
});

function aFile(dataUrl: string, nombre: string): File {
  const [cabecera, datos] = dataUrl.split(",");
  const tipo = cabecera.slice(5, cabecera.indexOf(";"));
  return new File([Buffer.from(datos, "base64")], nombre, { type: tipo });
}

/**
 * Corre un caso de validación: se simula desde el antes y se guarda junto al resultado
 * real de la clínica.
 *
 * No pasa por el tope mensual ni crea prospecto: no es trabajo de venta, es la medición
 * interna de qué tan cerca queda la simulación del resultado que la clínica entrega.
 */
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me || !isAdmin(me.role)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let datos: z.infer<typeof bodySchema>;
  try {
    datos = await parseJson(bodySchema, request);
  } catch {
    return NextResponse.json({ error: "Revise las dos fotografías." }, { status: 400 });
  }

  const { REPLICATE_API_TOKEN } = serverEnv();
  if (!REPLICATE_API_TOKEN) {
    console.error("[validacion] falta REPLICATE_API_TOKEN");
    return NextResponse.json({ error: "El simulador no está configurado." }, { status: 500 });
  }

  const subir = (dataUrl: string, nombre: string) =>
    put(`validaciones/${nombre}.jpg`, aFile(dataUrl, `${nombre}.jpg`), {
      access: "private",
      addRandomSuffix: true,
    });

  const [antes, real] = await Promise.all([subir(datos.antes, "antes"), subir(datos.real, "real")]);

  const [fila] = await db
    .insert(validaciones)
    .values({
      etiqueta: datos.etiqueta || null,
      antesUrl: antes.url,
      antesPathname: antes.pathname,
      realUrl: real.url,
      realPathname: real.pathname,
      modelo: MODELO,
    })
    .returning({ id: validaciones.id });

  const res = await generar(datos.cabeza, REPLICATE_API_TOKEN);
  if ("error" in res) {
    console.error("[validacion] el modelo falló", { id: fila.id, usuario: me.id, error: res.error });
    return NextResponse.json({ error: res.error, id: fila.id }, { status: 502 });
  }

  return NextResponse.json({ id: fila.id, imagen: `data:image/jpeg;base64,${res.base64}` });
}
