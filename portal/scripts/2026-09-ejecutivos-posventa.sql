-- Reunión con Ignacio (2026-09-22): corregir el nombre de Anahí y agregar a posventa.
-- Sofía y Andrea atienden cualquier sucursal, por eso van con todas.

BEGIN;

UPDATE ejecutivos SET nombre = 'Anahí Velasco' WHERE nombre = 'Ana';

INSERT INTO ejecutivos (nombre, sedes)
SELECT v.nombre, ARRAY['CDMX','EDO','QRO','GDL','TRC','MTY','TIJ','PUE','SLP','CUN','OAX','VER','MET','LEO']
FROM (VALUES ('Sofía (posventa)'), ('Andrea (posventa)')) AS v(nombre)
WHERE NOT EXISTS (SELECT 1 FROM ejecutivos e WHERE e.nombre = v.nombre);

SELECT nombre, sedes, activo FROM ejecutivos ORDER BY nombre;

COMMIT;
