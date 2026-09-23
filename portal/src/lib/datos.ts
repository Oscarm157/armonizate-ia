import { and, asc, count, desc, eq, gt, gte, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import { ejecutivos, prospectos, simulaciones, type Ejecutivo, type Resultado, type Simulacion } from "./schema";
import type { Sede } from "./sedes";
import { SIN_EJECUTIVO } from "./ejecutivos";

/** Cuántas generaciones se pueden pedir al mes entre todos. */
export const TOPE_MENSUAL = 500;

/** Primer instante del mes en curso, que es donde arranca la cuota. */
export function inicioDelMes(hoy = new Date()): Date {
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
}

/**
 * Generaciones del mes, de todos.
 *
 * El tope es global porque el acceso es con clave compartida: un tope por persona no
 * protegería el gasto, cualquiera puede elegir cualquier nombre. Se cuenta contra la
 * base y no en memoria porque cada instancia serverless arranca su propio contador.
 */
export async function consumoDelMes(): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(simulaciones)
    .where(gte(simulaciones.creadoEn, inicioDelMes()));
  return rows[0]?.n ?? 0;
}

/** Generaciones de un ejecutivo este mes. Es lo que se le muestra al terminar. */
export async function consumoDelEjecutivo(ejecutivoId: string): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(simulaciones)
    .where(and(eq(simulaciones.ejecutivoId, ejecutivoId), gte(simulaciones.creadoEn, inicioDelMes())));
  return rows[0]?.n ?? 0;
}

/** La lista de ejecutivos. Con `soloActivos` es la que se ofrece al generar. */
export async function listaEjecutivos({ soloActivos = false } = {}): Promise<Ejecutivo[]> {
  return db
    .select()
    .from(ejecutivos)
    .where(soloActivos ? eq(ejecutivos.activo, true) : undefined)
    .orderBy(asc(ejecutivos.nombre));
}

export type ProspectoConSimulaciones = {
  correo: string;
  vambe: string | null;
  asesor: string;
  ejecutivoId: string | null;
  resultado: Resultado;
  sede: Sede | null;
  simulaciones: Simulacion[];
};

/**
 * El historial, agrupado por prospecto.
 *
 * Se agrupa porque el mismo prospecto suele pedir varias simulaciones y el resultado
 * de la venta es uno solo: marcarlo por simulación daría números inflados.
 * `ejecutivo` filtra: un id, "ninguno" para lo que no tiene ejecutivo, o nada para todo.
 */
export async function historial({
  ejecutivo,
  limite = 80,
}: { ejecutivo?: string; limite?: number } = {}): Promise<ProspectoConSimulaciones[]> {
  const filtro =
    ejecutivo === "ninguno"
      ? isNull(simulaciones.ejecutivoId)
      : ejecutivo
        ? eq(simulaciones.ejecutivoId, ejecutivo)
        : undefined;

  const filas = await db
    .select()
    .from(simulaciones)
    .where(filtro)
    .orderBy(desc(simulaciones.creadoEn))
    .limit(limite);

  const estados = new Map((await db.select().from(prospectos)).map((p) => [p.correo, p]));
  const nombres = new Map((await listaEjecutivos()).map((e) => [e.id, e.nombre]));

  const agrupado = new Map<string, ProspectoConSimulaciones>();
  for (const s of filas) {
    const previo = agrupado.get(s.prospectoCorreo);
    if (previo) {
      previo.simulaciones.push(s);
      continue;
    }
    const p = estados.get(s.prospectoCorreo);
    agrupado.set(s.prospectoCorreo, {
      correo: s.prospectoCorreo,
      vambe: p?.vambe ?? s.prospectoVambe ?? null,
      asesor: (s.ejecutivoId && nombres.get(s.ejecutivoId)) || SIN_EJECUTIVO,
      ejecutivoId: s.ejecutivoId,
      resultado: p?.resultado ?? "pendiente",
      sede: p?.sede ?? s.sede ?? null,
      simulaciones: [s],
    });
  }
  return [...agrupado.values()];
}

export type FilaReporte = {
  sede: string;
  simulaciones: number;
  prospectos: number;
  ganados: number;
  perdidos: number;
  sinMarcar: number;
};

/**
 * El reporte que contesta la pregunta del negocio: cuántas ventas ayudó a cerrar la
 * herramienta, por plaza. Un prospecto cuenta una vez aunque tenga varias simulaciones.
 */
export async function reportePorSede(desde: Date, hasta: Date): Promise<FilaReporte[]> {
  const sims = await db
    .select({ sede: simulaciones.sede, n: count() })
    .from(simulaciones)
    .where(and(gte(simulaciones.creadoEn, desde), sql`${simulaciones.creadoEn} < ${hasta}`))
    .groupBy(simulaciones.sede);

  const props = await db
    .select({
      sede: prospectos.sede,
      resultado: prospectos.resultado,
      n: count(),
    })
    .from(prospectos)
    .where(and(gte(prospectos.creadoEn, desde), sql`${prospectos.creadoEn} < ${hasta}`))
    .groupBy(prospectos.sede, prospectos.resultado);

  const mapa = new Map<string, FilaReporte>();
  const fila = (sede: string | null) => {
    const clave = sede ?? "—";
    if (!mapa.has(clave))
      mapa.set(clave, { sede: clave, simulaciones: 0, prospectos: 0, ganados: 0, perdidos: 0, sinMarcar: 0 });
    return mapa.get(clave)!;
  };

  for (const s of sims) fila(s.sede).simulaciones = s.n;
  for (const p of props) {
    const f = fila(p.sede);
    f.prospectos += p.n;
    if (p.resultado === "ganado") f.ganados += p.n;
    else if (p.resultado === "perdido") f.perdidos += p.n;
    else f.sinMarcar += p.n;
  }

  return [...mapa.values()].sort((a, b) => b.ganados - a.ganados || b.simulaciones - a.simulaciones);
}

/**
 * Busca una simulación por el token de su enlace público, solo si sigue vigente.
 *
 * La vigencia se comprueba aquí, contra el reloj de la base y en cada petición, para que
 * la página y las imágenes caduquen a la vez. Si la página expirara pero las imágenes se
 * siguieran sirviendo, el enlace no caducaría de verdad.
 */
export async function porToken(token: string): Promise<Simulacion | null> {
  if (!token) return null;
  const filas = await db
    .select()
    .from(simulaciones)
    .where(and(eq(simulaciones.token, token), gt(simulaciones.expiraEn, new Date())));
  return filas[0] ?? null;
}
