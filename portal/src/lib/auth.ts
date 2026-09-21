// Primitivas de auth puras (sin imports de Next), seguras en middleware Edge y en
// server actions Node. Sesión como cookie firmada `uid.iat.HMAC`.

export const SESSION_COOKIE = "session";
const enc = new TextEncoder();

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 días

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET no está definida o es muy corta; no se pueden firmar sesiones.");
  }
  // Las claves de acceso entran en la firma: cambiar una cierra todas las sesiones
  // abiertas, que es lo que se busca si una clave se filtra.
  return `${s}|${process.env.ACCESO_EJECUTIVO ?? ""}|${process.env.ACCESO_ADMIN ?? ""}`;
}

async function hmacHex(msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signSession(userId: string, issuedAt: number): Promise<string> {
  const payload = `${userId}.${issuedAt}`;
  return `${payload}.${await hmacHex(payload)}`;
}

/** Devuelve el userId si la firma es válida y no expiró, si no null. */
export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!timingSafeEqual(sig, await hmacHex(payload))) return null;
  const [uid, iatStr] = payload.split(".");
  const iat = Number(iatStr);
  if (!uid || !Number.isFinite(iat)) return null;
  if (Date.now() / 1000 - iat > SESSION_MAX_AGE_S) return null;
  return uid;
}

export const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_S;
