"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { ejecutivos, simulaciones } from "@/lib/schema";
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

const correoSchema = z.string().trim().toLowerCase().email().max(120);

/**
 * Las simulaciones que ya tiene un paciente, para avisar antes de sumarle otra.
 *
 * Cuenta todas, no solo las de esta clave: el paciente es uno aunque lo haya atendido
 * otro ejecutivo. El correo se compara en minúsculas porque así lo guarda /api/simular.
 */
export async function simulacionesPrevias(correo: string) {
  const me = await requireUser();
  if (!canSimular(me.role)) return null;
  const datos = correoSchema.safeParse(correo);
  if (!datos.success) return null;

  const filas = await db
    .select({ creadoEn: simulaciones.creadoEn, ejecutivo: ejecutivos.nombre })
    .from(simulaciones)
    .leftJoin(ejecutivos, eq(ejecutivos.id, simulaciones.ejecutivoId))
    .where(eq(simulaciones.prospectoCorreo, datos.data))
    .orderBy(desc(simulaciones.creadoEn));

  if (!filas[0]) return null;
  return { n: filas.length, ultima: filas[0].creadoEn, ejecutivo: filas[0].ejecutivo };
}
