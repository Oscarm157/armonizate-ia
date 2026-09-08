"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { validaciones } from "@/lib/schema";
import { requireAdmin } from "@/lib/session";

const schema = z.object({
  id: z.string().uuid(),
  calificacion: z.number().int().min(1).max(5),
});

/** Del 1 al 5, qué tanto se parece la simulación al resultado real de la clínica. */
export async function calificarValidacion(id: string, calificacion: number) {
  await requireAdmin();
  const datos = schema.safeParse({ id, calificacion });
  if (!datos.success) return { error: "Calificación inválida." };

  await db
    .update(validaciones)
    .set({ calificacion: datos.data.calificacion })
    .where(eq(validaciones.id, datos.data.id));

  revalidatePath("/admin/validacion");
  return { ok: true };
}
