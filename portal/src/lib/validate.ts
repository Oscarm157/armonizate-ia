import { z } from "zod";

// Helpers para validar inputs de server actions / route handlers con Zod.
// Regla del starter: nada de leer FormData a mano sin validar.

export function parseForm<T extends z.ZodType>(schema: T, formData: FormData): z.infer<T> {
  return schema.parse(Object.fromEntries(formData.entries()));
}

export function safeParseForm<T extends z.ZodType>(
  schema: T,
  formData: FormData
): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
  const res = schema.safeParse(Object.fromEntries(formData.entries()));
  if (res.success) return { ok: true, data: res.data };
  return { ok: false, error: res.error.issues[0]?.message ?? "Datos inválidos." };
}

export async function parseJson<T extends z.ZodType>(schema: T, req: Request): Promise<z.infer<T>> {
  const body = await req.json().catch(() => ({}));
  return schema.parse(body);
}
