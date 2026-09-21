"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { ejecutivos } from "@/lib/schema";
import { requireAdmin } from "@/lib/session";
import { CODIGOS_SEDE } from "@/lib/sedes";

const datosSchema = z.object({
  nombre: z.string().trim().min(2, "Escriba el nombre.").max(80),
  // Vacío = sin sede.
  sede: z.union([z.enum(CODIGOS_SEDE as [string, ...string[]]), z.literal("")]),
});

function sedeONull(sede: string) {
  return sede === "" ? null : (sede as (typeof CODIGOS_SEDE)[number]);
}

export async function agregarEjecutivo(nombre: string, sede: string) {
  await requireAdmin();
  const d = datosSchema.safeParse({ nombre, sede });
  if (!d.success) return { error: d.error.issues[0]?.message ?? "Dato inválido." };

  await db.insert(ejecutivos).values({ nombre: d.data.nombre, sede: sedeONull(d.data.sede) });
  revalidatePath("/admin/ejecutivos");
  return { ok: true };
}

export async function editarEjecutivo(id: string, nombre: string, sede: string) {
  await requireAdmin();
  const d = datosSchema.safeParse({ nombre, sede });
  if (!d.success || !z.string().uuid().safeParse(id).success)
    return { error: d.success ? "Dato inválido." : (d.error.issues[0]?.message ?? "Dato inválido.") };

  const r = await db
    .update(ejecutivos)
    .set({ nombre: d.data.nombre, sede: sedeONull(d.data.sede) })
    .where(eq(ejecutivos.id, id))
    .returning({ id: ejecutivos.id });
  if (!r[0]) return { error: "No existe ese ejecutivo." };
  revalidatePath("/admin/ejecutivos");
  return { ok: true };
}

/**
 * Activa o desactiva. No se borra: sus simulaciones siguen en el historial a su nombre;
 * desactivado solo deja de aparecer en la lista al generar.
 */
export async function activarEjecutivo(id: string, activo: boolean) {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return { error: "Dato inválido." };

  const r = await db
    .update(ejecutivos)
    .set({ activo })
    .where(eq(ejecutivos.id, id))
    .returning({ id: ejecutivos.id });
  if (!r[0]) return { error: "No existe ese ejecutivo." };
  revalidatePath("/admin/ejecutivos");
  return { ok: true };
}
