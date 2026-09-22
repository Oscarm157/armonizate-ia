-- Un ejecutivo puede atender varias sucursales. Aditivo: la columna vieja `sede` se
-- conserva (el código ya no la usa) para poder volver atrás.
-- Correr en la consola de Neon ANTES de desplegar el código que usa `sedes`.

ALTER TABLE ejecutivos ADD COLUMN IF NOT EXISTS sedes text[] NOT NULL DEFAULT '{}';

UPDATE ejecutivos SET sedes = ARRAY[sede] WHERE sede IS NOT NULL AND sedes = '{}';
