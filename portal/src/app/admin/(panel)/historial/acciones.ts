"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { prospectos, simulaciones } from "@/lib/schema";
import { requireUser } from "@/lib/session";
import { venceEn } from "@/lib/enlace";

const marcaSchema = z.object({
  correo: z.string().trim().email().max(120),
  resultado: z.enum(["pendiente", "ganado", "perdido"]),
});

/**
 * Marca un prospecto como ganado o perdido.
 *
 * Es lo que después contesta si la herramienta ayudó a vender, así que solo puede
 * marcar quien generó esa simulación: el correo viene del cliente y se comprueba
 * contra la base antes de tocar nada.
 */
export async function marcarResultado(correo: string, resultado: string) {
  const me = await requireUser();
  const datos = marcaSchema.safeParse({ correo, resultado });
  if (!datos.success) return { error: "Dato inválido." };

  const suyas = await db
    .select({ sede: simulaciones.sede })
    .from(simulaciones)
    .where(
      and(
        eq(simulaciones.prospectoCorreo, datos.data.correo),
        eq(simulaciones.userId, me.id)
      )
    )
    .limit(1);
  if (!suyas[0]) return { error: "Ese prospecto no es tuyo." };

  await db
    .insert(prospectos)
    .values({
      correo: datos.data.correo,
      sede: suyas[0].sede ?? me.sede,
      resultado: datos.data.resultado,
      userId: me.id,
      marcadoEn: new Date(),
    })
    .onConflictDoUpdate({
      target: prospectos.correo,
      set: { resultado: datos.data.resultado, marcadoEn: new Date() },
    });

  revalidatePath("/admin/historial");
  return { ok: true };
}

/**
 * Vuelve a abrir el enlace del paciente por otras 24 horas.
 *
 * Los enlaces caducan a propósito, y el asesor necesita poder revivirlos cuando el
 * prospecto contesta tarde: sin esto tendría que generar otra vez y gastar cuota.
 */
export async function reactivarEnlace(id: string) {
  const me = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return { error: "Dato inválido." };

  const r = await db
    .update(simulaciones)
    .set({ expiraEn: venceEn() })
    .where(and(eq(simulaciones.id, id), eq(simulaciones.userId, me.id)))
    .returning({ token: simulaciones.token });

  if (!r[0]) return { error: "Esa simulación no es tuya." };
  revalidatePath("/admin/historial");
  return { ok: true, token: r[0].token };
}
