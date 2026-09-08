"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { requireUser } from "@/lib/session";
import { safeParseForm } from "@/lib/validate";

const perfilSchema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto.").max(80),
});

/** Cambiar el propio nombre. El correo y el rol solo los toca un administrador. */
export async function updateProfile(formData: FormData) {
  const me = await requireUser();
  const parsed = safeParseForm(perfilSchema, formData);
  if (!parsed.ok) return { error: parsed.error };

  await db.update(users).set({ name: parsed.data.name }).where(eq(users.id, me.id));
  revalidatePath("/admin/profile");
}
