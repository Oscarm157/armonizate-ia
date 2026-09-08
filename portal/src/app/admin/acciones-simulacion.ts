"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { simulaciones } from "@/lib/schema";
import { requireUser } from "@/lib/session";

const schema = z.object({
  id: z.string().uuid(),
  calificacion: z.number().int().min(1).max(5),
});

/**
 * Guarda del 1 al 5 cómo salió una simulación.
 *
 * El id viene del cliente, así que la fila se busca filtrando también por dueño: cada
 * quien califica lo suyo.
 */
export async function calificarSimulacion(id: string, calificacion: number) {
  const me = await requireUser();
  const datos = schema.safeParse({ id, calificacion });
  if (!datos.success) return { error: "Calificación inválida." };

  const r = await db
    .update(simulaciones)
    .set({ calificacion: datos.data.calificacion })
    .where(and(eq(simulaciones.id, datos.data.id), eq(simulaciones.userId, me.id)))
    .returning({ id: simulaciones.id });

  if (!r[0]) return { error: "Esa simulación no es tuya." };

  revalidatePath("/admin/historial");
  return { ok: true };
}
