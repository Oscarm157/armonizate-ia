-- Acceso por clave compartida + ejecutivos. Aditivo salvo los UPDATE de datos.
-- Correr UNA vez contra la base de producción, después de crear un branch de respaldo en Neon.
-- Las migraciones de drizzle/ están desfasadas de la base (se usó db:push), por eso va a mano.

BEGIN;

CREATE TABLE IF NOT EXISTS ejecutivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  sede text,
  activo boolean NOT NULL DEFAULT true,
  creado_en timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intentos_acceso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS intentos_acceso_ip_idx ON intentos_acceso (ip, creado_en);

ALTER TABLE simulaciones
  ADD COLUMN IF NOT EXISTS ejecutivo_id uuid REFERENCES ejecutivos(id) ON DELETE SET NULL;

-- Los dos usuarios de sistema, uno por clave.
INSERT INTO users (email, name, password_hash, role, active, must_change_password) VALUES
  ('administracion@acceso.interno', 'Administración', 'sin-clave-propia', 'admin', true, false),
  ('ejecutivos@acceso.interno', 'Ejecutivos', 'sin-clave-propia', 'agent', true, false)
ON CONFLICT (email) DO NOTHING;

-- Todo lo generado hasta hoy queda a nombre de Administración (decisión de Oscar, 2026-09-21).
UPDATE simulaciones
  SET user_id = (SELECT id FROM users WHERE email = 'administracion@acceso.interno');
UPDATE prospectos
  SET user_id = (SELECT id FROM users WHERE email = 'administracion@acceso.interno')
  WHERE user_id IS NOT NULL;

-- Las cuentas individuales dejan de entrar. No se borran.
UPDATE users SET active = false WHERE email NOT LIKE '%@acceso.interno';

INSERT INTO ejecutivos (nombre) VALUES
  ('Adrián Ruiz'),
  ('Alejandra Aremi'),
  ('Itzel Segura'),
  ('Alexa Valdes'),
  ('Ana'),
  ('Carolina');

COMMIT;
