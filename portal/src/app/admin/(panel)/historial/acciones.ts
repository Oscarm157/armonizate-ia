"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { prospectos, simulaciones } from "@/lib/schema";
import { requireUser } from "@/lib/session";
import { canSimular } from "@/lib/permissions";
import { venceEn } from "@/lib/enlace";

const marcaSchema = z.object({
  correo: z.string().trim().email().max(120),
  resultado: z.enum(["pendiente", "ganado", "perdido"]),
});

/**
 * Marca un prospecto como ganado o perdido.
 *
 * Es lo que después contesta si la herramienta ayudó a vender. El acceso es compartido,
 * así que marca cualquiera que pueda simular; el correo viene del cliente y se comprueba
 * contra la base antes de tocar nada.
 */
export async function marcarResultado(correo: string, resultado: string) {
  const me = await requireUser();
  if (!canSimular(me.role)) return { error: "Sin permiso." };
  const datos = marcaSchema.safeParse({ correo, resultado });
  if (!datos.success) return { error: "Dato inválido." };

  const fila = await db
    .select({ sede: simulaciones.sede })
    .from(simulaciones)
    .where(eq(simulaciones.prospectoCorreo, datos.data.correo))
    .limit(1);
  if (!fila[0]) return { error: "No existe ese prospecto." };

  await db
    .insert(prospectos)
    .values({
      correo: datos.data.correo,
      sede: fila[0].sede,
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
  if (!canSimular(me.role)) return { error: "Sin permiso." };
  if (!z.string().uuid().safeParse(id).success) return { error: "Dato inválido." };

  const r = await db
    .update(simulaciones)
    .set({ expiraEn: venceEn() })
    .where(eq(simulaciones.id, id))
    .returning({ token: simulaciones.token });

  if (!r[0]) return { error: "No existe esa simulación." };
  revalidatePath("/admin/historial");
  return { ok: true, token: r[0].token };
}
