import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import { serverEnv } from "./env";

type DB = ReturnType<typeof drizzle<typeof schema>>;

let client: DB | undefined;

function get(): DB {
  if (!client) client = drizzle(neon(serverEnv().DATABASE_URL), { schema });
  return client;
}

// Proxy lazy: `db.select()...` no inicializa la conexión hasta el primer uso,
// así el build no necesita DATABASE_URL.
export const db = new Proxy({} as DB, {
  get: (_t, prop) => Reflect.get(get(), prop),
});
