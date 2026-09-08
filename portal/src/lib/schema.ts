import { pgTable, uuid, text, timestamp, boolean } from "drizzle-orm/pg-core";

export type UserRole = "admin" | "agent" | "viewer";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<UserRole>().default("agent").notNull(),
  active: boolean("active").default(true).notNull(),
  mustChangePassword: boolean("must_change_password").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type User = typeof users.$inferSelect;

// ===== Simulaciones =====
// Una fila por generación pedida al modelo. La fila se crea ANTES de llamar a
// Replicate, porque es lo que cuenta contra la cuota mensual del vendedor: lo que
// se cobra es haber pedido la generación, no haberla guardado.
//
// `despuesUrl` queda en null hasta que el navegador termina de componer y sube el
// resultado; una fila sin `despuesUrl` es una generación que se pidió y no llegó a
// completarse, y sigue contando.
export const simulaciones = pgTable("simulaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  prospectoNombre: text("prospecto_nombre").notNull(),
  prospectoTelefono: text("prospecto_telefono").notNull(),
  antesUrl: text("antes_url").notNull(),
  antesPathname: text("antes_pathname").notNull(),
  despuesUrl: text("despues_url"),
  despuesPathname: text("despues_pathname"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
});

export type Simulacion = typeof simulaciones.$inferSelect;
