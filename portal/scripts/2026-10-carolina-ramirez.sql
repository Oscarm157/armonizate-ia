-- Carolina vuelve al simulador (2026-10-09): es la misma fila que se desactivó el 22-sep.
-- Se renombra a Carolina Ramirez, atiende solo CDMX y se reactiva.
-- El `AND nombre = 'Carolina'` evita escribir si la fila ya cambió.

BEGIN;

UPDATE ejecutivos
SET nombre = 'Carolina Ramirez', sedes = ARRAY['CDMX'], activo = true
WHERE id = '24e61b10-7275-427b-8763-c7aba7667574' AND nombre = 'Carolina';

SELECT nombre, sedes, activo FROM ejecutivos ORDER BY nombre;

COMMIT;
