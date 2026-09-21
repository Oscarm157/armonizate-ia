import type { UserRole } from "./schema";

// Roles: admin (clave de administración: ve todo y administra ejecutivos), agent
// (clave de ejecutivo: simulador e historial), viewer (solo lectura, sin clave hoy).
// Cualquier rol desconocido (datos viejos) se trata como "agent".
export function normalizeRole(role: string): UserRole {
  return role === "admin" || role === "viewer" ? role : "agent";
}

export const isAdmin = (r: UserRole) => r === "admin";
export const canWrite = (r: UserRole) => r === "admin" || r === "agent";
export const isReadOnly = (r: UserRole) => r === "viewer";

/** Quién puede pedirle una simulación al modelo. Un viewer solo mira. */
export function canSimular(role: UserRole): boolean {
  return canWrite(role);
}
