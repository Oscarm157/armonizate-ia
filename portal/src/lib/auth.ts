// Primitivas de auth puras (sin imports de Next), seguras en middleware Edge y en
// server actions Node. Hash de contraseña con PBKDF2 (Web Crypto); sesión como
// cookie firmada `uid.iat.HMAC`. Portado del patrón probado del CRM de BG.

export const SESSION_COOKIE = "session";
const enc = new TextEncoder();
const PBKDF2_ITER = 100_000;

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function pbkdf2(password: string, salt: Uint8Array, iter: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: iter, hash: "SHA-256" },
    key,
    256
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITER);
  return `pbkdf2$${PBKDF2_ITER}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iter = Number(parts[1]);
  const salt = fromB64(parts[2]);
  const expected = parts[3];
  const hash = await pbkdf2(password, salt, iter);
  return timingSafeEqual(toB64(hash), expected);
}

const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 días

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET no está definida o es muy corta; no se pueden firmar sesiones.");
  }
  return s;
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
