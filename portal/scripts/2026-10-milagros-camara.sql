-- Alta de Milagros Cámara (2026-10-21). Atiende Lima, Perú: sede LIM, agregada en src/lib/sedes.ts.
-- El NOT EXISTS evita duplicarla si el script corre dos veces.

BEGIN;

INSERT INTO ejecutivos (nombre, sedes, activo)
SELECT 'Milagros Cámara', ARRAY['LIM'], true
WHERE NOT EXISTS (SELECT 1 FROM ejecutivos WHERE nombre = 'Milagros Cámara');

SELECT nombre, sedes, activo FROM ejecutivos ORDER BY nombre;

COMMIT;
