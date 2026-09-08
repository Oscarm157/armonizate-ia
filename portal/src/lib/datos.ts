import { and, count, desc, eq, gte } from "drizzle-orm";
import { db } from "./db";
import { simulaciones, users, type Simulacion, type User } from "./schema";

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
 * Se cuenta contra la base y no en memoria: el rate limit por instancia no sirve
 * como tope de gasto porque cada instancia serverless arranca su propio contador.
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

/** Historial de un vendedor, lo más reciente primero. */
export async function misSimulaciones(userId: string, limite = 60): Promise<Simulacion[]> {
  return db
    .select()
    .from(simulaciones)
    .where(eq(simulaciones.userId, userId))
    .orderBy(desc(simulaciones.creadoEn))
    .limit(limite);
}
