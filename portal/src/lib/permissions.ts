import type { UserRole } from "./schema";

// Roles: admin (administra el equipo y ve todo), agent (el vendedor: genera
// simulaciones y ve las suyas), viewer (solo lectura).
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

/** Quién ve las simulaciones de todo el equipo, no solo las suyas. */
export function canVerTodo(role: UserRole): boolean {
  return role === "admin" || role === "viewer";
}

export function canManageUsers(role: UserRole): boolean {
  return role === "admin";
}
