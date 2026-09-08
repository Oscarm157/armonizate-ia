import { pgTable, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import type { Sede } from "./sedes";

export type UserRole = "admin" | "agent" | "viewer";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<UserRole>().default("agent").notNull(),
  // Sede a la que pertenece el vendedor. De aquí sale el corte por plaza del reporte:
  // así no hay que pedirle la plaza en cada simulación ni puede equivocarse.
  sede: text("sede").$type<Sede>(),
  active: boolean("active").default(true).notNull(),
  mustChangePassword: boolean("must_change_password").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type User = typeof users.$inferSelect;

// ===== Prospectos =====
// El resultado de la venta vive aquí y no en cada simulación: un mismo prospecto puede
// pedir varias simulaciones y de todas ellas sale una sola venta. El teléfono es el
// identificador, que es como el vendedor lo tiene en WhatsApp.
export type Resultado = "pendiente" | "ganado" | "perdido";

export const prospectos = pgTable("prospectos", {
  telefono: text("telefono").primaryKey(),
  sede: text("sede").$type<Sede>(),
  resultado: text("resultado").$type<Resultado>().default("pendiente").notNull(),
  // Quién lo captó: sirve para que cada vendedor marque lo suyo.
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
  marcadoEn: timestamp("marcado_en", { withTimezone: true }),
});

export type Prospecto = typeof prospectos.$inferSelect;

// ===== Simulaciones =====
// Una fila por generación pedida al modelo. La fila se crea ANTES de llamar al modelo,
// porque es lo que cuenta contra la cuota mensual del vendedor: lo que se cobra es
// haber pedido la generación, no haberla guardado.
//
// `despuesUrl` queda en null hasta que el navegador termina de componer y sube el
// resultado; una fila sin `despuesUrl` es una generación que se pidió y no llegó a
// completarse, y sigue contando.
export const simulaciones = pgTable("simulaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  prospectoTelefono: text("prospecto_telefono").notNull(),
  sede: text("sede").$type<Sede>(),
  antesUrl: text("antes_url").notNull(),
  antesPathname: text("antes_pathname").notNull(),
  despuesUrl: text("despues_url"),
  despuesPathname: text("despues_pathname"),
  // Del 1 al 5, cómo salió esta generación en particular. Sirve para medir si el
  // modelo mejora cuando se cambie el prompt o el modelo, no para evaluar al asesor.
  calificacion: integer("calificacion"),
  // Qué modelo la generó: sin esto, comparar calificaciones entre versiones no dice nada.
  modelo: text("modelo"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
});

export type Simulacion = typeof simulaciones.$inferSelect;
