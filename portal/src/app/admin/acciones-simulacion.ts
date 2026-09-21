"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { simulaciones } from "@/lib/schema";
import { requireUser } from "@/lib/session";
import { canSimular } from "@/lib/permissions";

const schema = z.object({
  id: z.string().uuid(),
  calificacion: z.number().int().min(1).max(5),
});

/**
 * Guarda del 1 al 5 cómo salió una simulación.
 *
 * El id viene del cliente y se comprueba contra la base. El acceso es compartido, así
 * que califica cualquiera que pueda simular.
 */
export async function calificarSimulacion(id: string, calificacion: number) {
  const me = await requireUser();
  if (!canSimular(me.role)) return { error: "Sin permiso." };
  const datos = schema.safeParse({ id, calificacion });
  if (!datos.success) return { error: "Calificación inválida." };

  const r = await db
    .update(simulaciones)
    .set({ calificacion: datos.data.calificacion })
    .where(eq(simulaciones.id, datos.data.id))
    .returning({ id: simulaciones.id });

  if (!r[0]) return { error: "No existe esa simulación." };

  revalidatePath("/admin/historial");
  return { ok: true };
}
