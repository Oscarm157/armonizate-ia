import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { prospectos, simulaciones, users, type Resultado, type Simulacion, type User } from "./schema";
import type { Sede } from "./sedes";

/** Cuántas generaciones puede pedir un vendedor al mes. */
export const TOPE_MENSUAL = 100;

/** Primer instante del mes en curso, que es donde arranca la cuota. */
export function inicioDelMes(hoy = new Date()): Date {
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
}

export async function getAllUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(desc(users.createdAt));
}

/**
 * Generaciones que lleva un vendedor este mes.
 *
 * Se cuenta contra la base y no en memoria: el rate limit por instancia no sirve como
 * tope de gasto porque cada instancia serverless arranca su propio contador.
 */
export async function consumoDelMes(userId: string): Promise<number> {
  const rows = await db
    .select({ n: count() })
    .from(simulaciones)
    .where(and(eq(simulaciones.userId, userId), gte(simulaciones.creadoEn, inicioDelMes())));
  return rows[0]?.n ?? 0;
}

/** Consumo del mes de todo el equipo, para el panel de administración. */
export async function consumoDelEquipo(): Promise<Map<string, number>> {
  const rows = await db
    .select({ userId: simulaciones.userId, n: count() })
    .from(simulaciones)
    .where(gte(simulaciones.creadoEn, inicioDelMes()))
    .groupBy(simulaciones.userId);
  return new Map(rows.map((r) => [r.userId, r.n]));
}

export type ProspectoConSimulaciones = {
  telefono: string;
  resultado: Resultado;
  sede: Sede | null;
  simulaciones: Simulacion[];
};

/**
 * El historial de un vendedor, agrupado por prospecto.
 *
 * Se agrupa porque el mismo prospecto suele pedir varias simulaciones y el resultado
 * de la venta es uno solo: marcarlo por simulación daría números inflados.
 */
export async function misProspectos(userId: string, limite = 80): Promise<ProspectoConSimulaciones[]> {
  const filas = await db
    .select()
    .from(simulaciones)
    .where(eq(simulaciones.userId, userId))
    .orderBy(desc(simulaciones.creadoEn))
    .limit(limite);

  const estados = new Map(
    (await db.select().from(prospectos).where(eq(prospectos.userId, userId))).map((p) => [
      p.telefono,
      p,
    ])
  );

  const agrupado = new Map<string, ProspectoConSimulaciones>();
  for (const s of filas) {
    const previo = agrupado.get(s.prospectoTelefono);
    if (previo) {
      previo.simulaciones.push(s);
      continue;
    }
    const p = estados.get(s.prospectoTelefono);
    agrupado.set(s.prospectoTelefono, {
      telefono: s.prospectoTelefono,
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
