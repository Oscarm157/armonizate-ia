-- Ejecutivo para las pruebas de Oscar, con todas las sucursales. Se puede desactivar
-- después desde Ejecutivos (su historial se conserva).
INSERT INTO ejecutivos (nombre, sedes)
SELECT 'Oscar (pruebas)', ARRAY['CDMX','EDO','QRO','GDL','TRC','MTY','TIJ','PUE','SLP','CUN','OAX','VER','MET','LEO']
WHERE NOT EXISTS (SELECT 1 FROM ejecutivos WHERE nombre = 'Oscar (pruebas)');

SELECT nombre, sedes, activo FROM ejecutivos ORDER BY nombre;
