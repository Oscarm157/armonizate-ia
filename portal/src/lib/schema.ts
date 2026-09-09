import { pgTable, uuid, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import type { Sede } from "./sedes";
import type { Grado } from "./simulador/grado";

export type UserRole = "admin" | "agent" | "viewer";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<UserRole>().default("agent").notNull(),
  // Sede a la que pertenece el asesor. De aquí sale el corte por plaza del reporte.
  sede: text("sede").$type<Sede>(),
  active: boolean("active").default(true).notNull(),
  mustChangePassword: boolean("must_change_password").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type User = typeof users.$inferSelect;

// ===== Prospectos =====
// El resultado de la venta vive aquí y no en cada simulación: un mismo prospecto puede
// pedir varias simulaciones y de todas ellas sale una sola venta.
//
// El identificador es el correo, que es lo estable. El enlace de Vambe se guarda para
// poder volver al contacto en el CRM desde el historial.
export type Resultado = "pendiente" | "ganado" | "perdido";

export const prospectos = pgTable("prospectos", {
  correo: text("correo").primaryKey(),
  vambe: text("vambe"),
  sede: text("sede").$type<Sede>(),
  resultado: text("resultado").$type<Resultado>().default("pendiente").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
  marcadoEn: timestamp("marcado_en", { withTimezone: true }),
});

export type Prospecto = typeof prospectos.$inferSelect;

// ===== Simulaciones =====
// Una fila por generación pedida al modelo. Se crea ANTES de llamar al modelo, porque
// es lo que cuenta contra la cuota: lo que se cobra es haber pedido la generación.
export const simulaciones = pgTable("simulaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  prospectoCorreo: text("prospecto_correo").notNull(),
  prospectoVambe: text("prospecto_vambe"),
  sede: text("sede").$type<Sede>(),

  antesUrl: text("antes_url").notNull(),
  antesPathname: text("antes_pathname").notNull(),
  despuesUrl: text("despues_url"),
  despuesPathname: text("despues_pathname"),
  // Las piezas ya armadas, con marco y aviso. Se guardan porque antes se montaban al
  // descargar y se perdían: si el asesor cerraba sin bajarlas, no quedaba nada.
  piezaUrl: text("pieza_url"),
  piezaPathname: text("pieza_pathname"),
  comparativaUrl: text("comparativa_url"),
  comparativaPathname: text("comparativa_pathname"),

  // Enlace que se le manda al paciente. Vive 24 horas y el asesor puede reactivarlo.
  // Se le manda el enlace y no la imagen para poder caducarlo: una foto reenviada por
  // WhatsApp ya no se puede retirar.
  token: text("token").unique(),
  expiraEn: timestamp("expira_en", { withTimezone: true }),

  // Qué tan separadas venían las orejas, según el asesor. Es lo que decide qué prompt
  // se manda: la corrección no puede ser la misma para unas orejas muy abiertas que
  // para una separación mínima. Nulo en las filas anteriores a que existiera el grado.
  grado: text("grado").$type<Grado>(),

  // Si el enlace del paciente lleva la promoción del 10%. Lo decide el asesor al
  // generar: hay escalera de precios y un lead que ya viene con su descuento tope no
  // debe llevar código encima. Las filas anteriores a la promoción quedan en false,
  // que es lo que de verdad pasó con ellas.
  promocion: boolean("promocion").default(false).notNull(),

  calificacion: integer("calificacion"),
  modelo: text("modelo"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
});

export type Simulacion = typeof simulaciones.$inferSelect;

// ===== Validación interna =====
// Casos reales con su antes y su después de verdad, para comparar contra lo que simula
// la herramienta. Solo lo ve un administrador: son fotos de pacientes y el propósito es
// medir el modelo, no operar.
export const validaciones = pgTable("validaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  etiqueta: text("etiqueta"),
  antesUrl: text("antes_url").notNull(),
  antesPathname: text("antes_pathname").notNull(),
  // El resultado real de la clínica. El modelo nunca lo ve: se genera desde el antes.
  realUrl: text("real_url").notNull(),
  realPathname: text("real_pathname").notNull(),
  simuladaUrl: text("simulada_url"),
  simuladaPathname: text("simulada_pathname"),
  grado: text("grado").$type<Grado>(),
  calificacion: integer("calificacion"),
  modelo: text("modelo"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow(),
});

export type Validacion = typeof validaciones.$inferSelect;
