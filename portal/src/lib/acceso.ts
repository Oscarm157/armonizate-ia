import { createHash, timingSafeEqual } from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "./db";
import { intentosAcceso, users, type User, type UserRole } from "./schema";
import { serverEnv } from "./env";

// Cada clave entra como un usuario de sistema fijo. Así la sesión, los roles y los
// guards siguen funcionando igual que con cuentas individuales.
const CUENTAS: Record<"ejecutivo" | "admin", { email: string; name: string; role: UserRole }> = {
  ejecutivo: { email: "ejecutivos@acceso.interno", name: "Ejecutivos", role: "agent" },
  admin: { email: "administracion@acceso.interno", name: "Administración", role: "admin" },
};

export const MAX_INTENTOS = 5;
export const VENTANA_MIN = 15;

// Se comparan los hashes y no las cadenas: timingSafeEqual exige el mismo largo, y
// comparar el largo delataría cuántos caracteres tiene la clave.
function igual(a: string, b: string): boolean {
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(a), h(b));
}

export function rolDeClave(clave: string): keyof typeof CUENTAS | null {
  const { ACCESO_EJECUTIVO, ACCESO_ADMIN } = serverEnv();
  if (igual(clave, ACCESO_ADMIN)) return "admin";
  if (igual(clave, ACCESO_EJECUTIVO)) return "ejecutivo";
  return null;
}

/** El usuario de sistema de esa clave. Se crea la primera vez que alguien entra. */
export async function cuentaDe(tipo: keyof typeof CUENTAS): Promise<User> {
  const c = CUENTAS[tipo];
  const [fila] = await db
    .insert(users)
    .values({ ...c, passwordHash: "sin-clave-propia", mustChangePassword: false })
    .onConflictDoUpdate({ target: users.email, set: { role: c.role, active: true } })
    .returning();
  return fila;
}

export async function bloqueada(ip: string): Promise<boolean> {
  const desde = new Date(Date.now() - VENTANA_MIN * 60_000);
  const [r] = await db
    .select({ n: count() })
    .from(intentosAcceso)
    .where(and(eq(intentosAcceso.ip, ip), gte(intentosAcceso.creadoEn, desde)));
  return (r?.n ?? 0) >= MAX_INTENTOS;
}

export async function registrarFallo(ip: string): Promise<void> {
  await db.insert(intentosAcceso).values({ ip });
}
