import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { checkBotId } from "botid/server";
import { put } from "@vercel/blob";
import { z } from "zod";
import { db } from "@/lib/db";
import { ejecutivos, prospectos, simulaciones } from "@/lib/schema";
import { getCurrentUser } from "@/lib/session";
import { canSimular, isAdmin } from "@/lib/permissions";
import { consumoDelEjecutivo, consumoDelMes, TOPE_MENSUAL } from "@/lib/datos";
import { nuevoToken, venceEn } from "@/lib/enlace";
import { serverEnv } from "@/lib/env";
import { parseJson } from "@/lib/validate";
import { generar, MODELO } from "@/lib/simulador/modelo";

export const runtime = "nodejs";
export const maxDuration = 300;

const DATA_URL = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

const bodySchema = z.object({
  // recorte cuadrado de la cabeza, es lo que ve el modelo
  cabeza: z.string().regex(DATA_URL, "Imagen inválida."),
  // foto completa tal como la subió el vendedor, es lo que se guarda
  original: z.string().regex(DATA_URL, "Imagen inválida."),
  correo: z.string().trim().email("Correo inválido.").max(120),
  vambe: z.string().trim().url("El enlace de Vambe no es válido.").max(400),
  // Sin grado no se genera: es lo que decide cuánta corrección se aplica.
  grado: z.enum(["alto", "medio", "bajo"]),
  // La segunda opción va con más empuje: repetir el mismo prompt casi nunca mejora.
  fuerte: z.boolean().optional(),
  // Quién generó: el acceso es compartido, así que se elige de la lista al generar.
  // Vacío es "Administración", y solo se acepta entrando con la clave de admin: son las
  // pruebas, que llevan su propio conteo y no se le cargan a ningún ejecutivo.
  ejecutivoId: z.union([z.string().uuid(), z.literal("")]),
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

  // BotID solo funciona desplegado en Vercel; en local lanza al intentar poner
  // headers. Si no puede verificar, se sigue: el guard de sesión ya cerró la puerta.
  try {
    const verificacion = await checkBotId();
    if (verificacion.isBot) return NextResponse.json({ error: "Bloqueado." }, { status: 403 });
  } catch (e) {
    if (process.env.VERCEL) throw e;
  }

  let datos: z.infer<typeof bodySchema>;
  try {
    datos = await parseJson(bodySchema, request);
  } catch {
    return NextResponse.json(
      { error: "Revisa la fotografía, el grado, el ejecutivo, el correo y el enlace de Vambe." },
      { status: 400 }
    );
  }

  // Sin ejecutivo solo genera administración; a un ejecutivo se le sigue exigiendo.
  if (!datos.ejecutivoId && !isAdmin(me.role))
    return NextResponse.json({ error: "Elige un ejecutivo de la lista." }, { status: 400 });

  // El id viene del cliente: se comprueba contra la base que exista y siga activo.
  let ejecutivo: typeof ejecutivos.$inferSelect | null = null;
  if (datos.ejecutivoId) {
    const [fila] = await db
      .select()
      .from(ejecutivos)
      .where(and(eq(ejecutivos.id, datos.ejecutivoId), eq(ejecutivos.activo, true)));
    if (!fila) return NextResponse.json({ error: "Elige un ejecutivo de la lista." }, { status: 400 });
    ejecutivo = fila;
  }

  // El tope se verifica ANTES de llamar al modelo: pasado el límite no se gasta.
  const usadas = await consumoDelMes(me.id);
  if (usadas >= TOPE_MENSUAL) {
    return NextResponse.json(
      { error: `Se alcanzó el límite de ${TOPE_MENSUAL} simulaciones de este mes.`, usadas, tope: TOPE_MENSUAL },
      { status: 429 }
    );
  }

  const { REPLICATE_API_TOKEN } = serverEnv();
  if (!REPLICATE_API_TOKEN) {
    console.error(JSON.stringify({ evento: "simular_sin_token" }));
    return NextResponse.json({ error: "El simulador no está configurado." }, { status: 500 });
  }

  // Store privado: la foto de un paciente no debe quedar accesible por URL.
  const antes = await put(`simulaciones/${me.id}/antes.jpg`, aFile(datos.original, "antes.jpg"), {
    access: "private",
    addRandomSuffix: true,
  });

  // El prospecto se crea la primera vez que se le genera algo. La sede ya no se le
  // pregunta al ejecutivo (el enlace del paciente abre WhatsApp sin número de sucursal):
  // se toma la suya cuando atiende una sola, y si atiende varias queda sin sede, que es
  // lo único honesto. De aquí sale el corte por plaza del reporte.
  const sede = ejecutivo?.sedes.length === 1 ? ejecutivo.sedes[0] : null;
  const correo = datos.correo.toLowerCase();

  await db
    .insert(prospectos)
    .values({ correo, vambe: datos.vambe, sede, userId: me.id })
    .onConflictDoUpdate({ target: prospectos.correo, set: { vambe: datos.vambe } });

  // La fila se crea antes de llamar al modelo: lo que consume cuota es haber pedido la
  // generación, no haberla terminado.
  const [fila] = await db
    .insert(simulaciones)
    .values({
      userId: me.id,
      ejecutivoId: ejecutivo?.id ?? null,
      prospectoCorreo: correo,
      prospectoVambe: datos.vambe,
      sede,
      grado: datos.grado,
      modelo: MODELO,
      antesUrl: antes.url,
      antesPathname: antes.pathname,
      // El enlace nace con la simulación: es lo que se le manda al paciente.
      token: nuevoToken(),
      expiraEn: venceEn(),
    })
    .returning({ id: simulaciones.id, token: simulaciones.token });

  const res = await generar(datos.cabeza, datos.grado, REPLICATE_API_TOKEN, datos.fuerte);
  if ("error" in res) {
    // La fila ya consumió cuota: sin el id aquí, un "no me generó" del ejecutivo no se puede
    // atar a la simulación que se le cobró.
    console.error(
      JSON.stringify({ evento: "simular_fallo_ruta", id: fila.id, usuario: me.id, error: res.error })
    );
    return NextResponse.json({ error: res.error, id: fila.id }, { status: 502 });
  }

  return NextResponse.json({
    id: fila.id,
    token: fila.token,
    imagen: `data:image/jpeg;base64,${res.base64}`,
    usadas: usadas + 1,
    tope: TOPE_MENSUAL,
    // Cuántas lleva este ejecutivo en el mes: se le muestra al terminar. Generando como
    // administración no hay a quién contárselas.
    delEjecutivo: ejecutivo ? await consumoDelEjecutivo(ejecutivo.id) : null,
    ejecutivo: ejecutivo?.nombre ?? null,
  });
}
