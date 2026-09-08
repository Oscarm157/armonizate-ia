"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { prospectos, simulaciones } from "@/lib/schema";
import { requireUser } from "@/lib/session";

const marcaSchema = z.object({
  telefono: z.string().trim().min(7).max(25),
  resultado: z.enum(["pendiente", "ganado", "perdido"]),
});

/**
 * Marca un prospecto como ganado o perdido.
 *
 * Es lo que después contesta si la herramienta ayudó a vender, así que solo puede
 * marcar quien generó esa simulación: el teléfono viene del cliente y se comprueba
 * contra la base antes de tocar nada.
 */
export async function marcarResultado(telefono: string, resultado: string) {
  const me = await requireUser();
  const datos = marcaSchema.safeParse({ telefono, resultado });
  if (!datos.success) return { error: "Dato inválido." };

  const suyas = await db
    .select({ sede: simulaciones.sede })
    .from(simulaciones)
    .where(
      and(
        eq(simulaciones.prospectoTelefono, datos.data.telefono),
        eq(simulaciones.userId, me.id)
      )
    )
    .limit(1);
  if (!suyas[0]) return { error: "Ese prospecto no es tuyo." };

  await db
    .insert(prospectos)
    .values({
      telefono: datos.data.telefono,
      sede: suyas[0].sede ?? me.sede,
      resultado: datos.data.resultado,
      userId: me.id,
      marcadoEn: new Date(),
    })
    .onConflictDoUpdate({
      target: prospectos.telefono,
      set: { resultado: datos.data.resultado, marcadoEn: new Date() },
    });

  revalidatePath("/admin/historial");
  return { ok: true };
}
