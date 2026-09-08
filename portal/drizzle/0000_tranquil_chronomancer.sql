CREATE TABLE "prospectos" (
	"telefono" text PRIMARY KEY NOT NULL,
	"sede" text,
	"resultado" text DEFAULT 'pendiente' NOT NULL,
	"user_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now(),
	"marcado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "simulaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"prospecto_telefono" text NOT NULL,
	"sede" text,
	"antes_url" text NOT NULL,
	"antes_pathname" text NOT NULL,
	"despues_url" text,
	"despues_pathname" text,
	"creado_en" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'agent' NOT NULL,
	"sede" text,
	"active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "prospectos" ADD CONSTRAINT "prospectos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulaciones" ADD CONSTRAINT "simulaciones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;