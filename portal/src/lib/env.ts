import { z } from "zod";

// Validación de entorno con Zod. Lazy: no se valida en build, solo al primer uso
// en runtime, para que `next build` sin secretos no truene.
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL es requerida."),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET debe tener al menos 16 caracteres."),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional().or(z.literal("")),
  // Simulador: llave de Replicate. Sin ella el portal levanta pero no genera.
  REPLICATE_API_TOKEN: z.string().optional(),
});

let cached: z.infer<typeof schema> | undefined;

export function serverEnv() {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}
