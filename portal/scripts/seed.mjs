import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

// Crea un usuario admin inicial. Idempotente por email.
// Hash compatible con src/lib/auth.ts: pbkdf2$iter$saltB64$hashB64 (SHA-256, 32 bytes).
const sql = neon(process.env.DATABASE_URL);

function hashPassword(pw) {
  const iter = 100_000;
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(pw, salt, iter, 32, "sha256");
  return `pbkdf2$${iter}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

const email = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const password = process.env.SEED_ADMIN_PASSWORD || crypto.randomBytes(9).toString("base64url");

const existing = await sql`select id from users where email = ${email}`;
if (existing.length) {
  console.log(`Ya existe ${email}, no se hace nada.`);
} else {
  await sql`
    insert into users (email, name, password_hash, role, must_change_password)
    values (${email}, 'Admin', ${hashPassword(password)}, 'admin', true)
  `;
  console.log(`Admin creado: ${email} / ${password}`);
  console.log("Cámbiala en el primer inicio de sesión.");
}
