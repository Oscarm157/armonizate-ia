-- Sucursales de cada ejecutivo según la tabla de distribución que pasó Oscar (2026-09-22).
-- Carolina solo atiende lobuloplastia y escafa: se desactiva (su historial se conserva).

BEGIN;

UPDATE ejecutivos SET sedes = ARRAY['QRO','PUE','VER']             WHERE nombre = 'Alejandra Aremi';
UPDATE ejecutivos SET sedes = ARRAY['CDMX','EDO','MET','LEO']      WHERE nombre IN ('Alexa Valdes', 'Ana');
UPDATE ejecutivos SET sedes = ARRAY['GDL','SLP','CUN','TRC','OAX'] WHERE nombre = 'Itzel Segura';
UPDATE ejecutivos SET sedes = ARRAY['MTY','TIJ']                   WHERE nombre = 'Adrián Ruiz';
UPDATE ejecutivos SET activo = false                               WHERE nombre = 'Carolina';

SELECT nombre, sedes, activo FROM ejecutivos ORDER BY nombre;

COMMIT;
