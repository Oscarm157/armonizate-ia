import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, type User, type UserRole } from "./schema";
import { SESSION_COOKIE, verifySession } from "./auth";

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const uid = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!uid) return null;
  const rows = await db.select().from(users).where(eq(users.id, uid));
  const u = rows[0];
  if (!u || !u.active) return null;
  return u;
}

/** Usar al inicio de toda página/action protegida. Redirige a /login si no hay sesión. */
export async function requireUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

/** Exige uno de los roles. Redirige a / si no cumple. */
export async function requireRole(...roles: UserRole[]): Promise<User> {
  const u = await requireUser();
  if (!roles.includes(u.role)) redirect("/");
  return u;
}

/** Exige rol admin. Redirige a / si no cumple. */
export async function requireAdmin(): Promise<User> {
  return requireRole("admin");
}
