"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  hashPassword,
  signSession,
  verifyPassword,
} from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { safeParseForm } from "@/lib/validate";

const loginSchema = z.object({
  email: z.string().email("Correo inválido."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

async function setSessionCookie(userId: string) {
  const token = await signSession(userId, Math.floor(Date.now() / 1000));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function login(formData: FormData): Promise<{ error: string } | void> {
  const parsed = safeParseForm(loginSchema, formData);
  if (!parsed.ok) return { error: parsed.error };

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()));
  const user = rows[0];

  // Mensaje genérico: no revelar si el correo existe.
  if (!user || !user.active) return { error: "Correo o contraseña incorrectos." };

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return { error: "Correo o contraseña incorrectos." };

  await setSessionCookie(user.id);
  redirect(user.mustChangePassword ? "/change-password" : "/admin");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Escribe tu contraseña actual."),
    next: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    confirm: z.string().min(1, "Confirma la nueva contraseña."),
  })
  .refine((d) => d.next === d.confirm, {
    message: "Las contraseñas no coinciden.",
    path: ["confirm"],
  });

export async function changePassword(
  formData: FormData
): Promise<{ error: string } | void> {
  const me = await requireUser();

  const parsed = safeParseForm(changePasswordSchema, formData);
  if (!parsed.ok) return { error: parsed.error };

  const ok = await verifyPassword(parsed.data.current, me.passwordHash);
  if (!ok) return { error: "La contraseña actual es incorrecta." };

  const passwordHash = await hashPassword(parsed.data.next);
  await db
    .update(users)
    .set({ passwordHash, mustChangePassword: false })
    .where(eq(users.id, me.id));

  redirect("/admin");
}
