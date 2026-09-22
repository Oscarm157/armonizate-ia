"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkBotId } from "botid/server";
import { z } from "zod";

import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession } from "@/lib/auth";
import { VENTANA_MIN, bloqueada, cuentaDe, registrarFallo, rolDeClave } from "@/lib/acceso";
import { safeParseForm } from "@/lib/validate";

const loginSchema = z.object({
  clave: z.string().min(1, "Escribe la clave de acceso.").max(200),
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

  // BotID solo funciona desplegado en Vercel; en local lanza al intentar poner headers.
  try {
    if ((await checkBotId()).isBot) return { error: "Acceso bloqueado." };
  } catch (e) {
    if (process.env.VERCEL) throw e;
  }

  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";

  if (await bloqueada(ip))
    return { error: `Demasiados intentos. Espera ${VENTANA_MIN} minutos y vuelve a intentar.` };

  const tipo = rolDeClave(parsed.data.clave);
  if (!tipo) {
    await registrarFallo(ip);
    console.warn(JSON.stringify({ evento: "acceso_fallido", ip }));
    return { error: "La clave no es correcta." };
  }

  const cuenta = await cuentaDe(tipo);
  await setSessionCookie(cuenta.id);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
