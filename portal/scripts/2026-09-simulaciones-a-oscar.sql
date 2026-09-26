-- Todo el histórico pasa a 'Oscar (pruebas)', para que los demás ejecutivos arranquen el
-- contador en cero sin que se pierda nada.
-- Correr UNA vez contra la base de producción, después de crear un branch de respaldo en Neon.
-- Las migraciones de drizzle/ están desfasadas de la base (se usó db:push), por eso va a mano.
--
-- Contexto: hay dos contadores distintos y los dos salen de esta tabla.
--   · "X lleva N simulaciones este mes" cuenta por `ejecutivo_id` (lib/datos.ts,
--     consumoDelEjecutivo). Moverlo es lo que pone a los demás ejecutivos en cero.
--   · "Este mes: X / 500" cuenta por `user_id`, que es la cuenta de sistema de la clave con la
--     que se generó (lib/acceso.ts). Moverlo es lo que pone la cuota en cero.
-- Se mueven los dos. Ojo con la consecuencia de mover `user_id`: el historial que ve el
-- ejecutivo filtra por esa columna, así que el equipo arranca con historial vacío.
-- Administración lo sigue viendo todo, a nombre de Oscar (pruebas).
--
-- `prospectos` no se toca: nada en el código lee `prospectos.user_id`.

-- PASO 1, MIRAR: cuántas filas se van a mover y de quién son ahora.
-- Correr esto solo y confirmar los números antes de seguir.
SELECT
  COALESCE(e.nombre, 'Administración')                              AS ejecutivo_actual,
  u.email                                                           AS clave_actual,
  count(*) FILTER (WHERE s.creado_en >= date_trunc('month', now()))  AS este_mes,
  count(*)                                                          AS total
FROM simulaciones s
LEFT JOIN ejecutivos e ON e.id = s.ejecutivo_id
LEFT JOIN users u      ON u.id = s.user_id
GROUP BY 1, 2
ORDER BY total DESC;

-- PASO 2, MOVER.
BEGIN;

-- Si alguno de los dos destinos no existe, aquí se cae y no se escribe nada. Sin esto,
-- `ejecutivo_id` aceptaría el NULL en silencio y el histórico quedaría como "Administración".
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ejecutivos WHERE nombre = 'Oscar (pruebas)') THEN
    RAISE EXCEPTION 'No existe el ejecutivo Oscar (pruebas): corre antes 2026-09-ejecutivo-pruebas.sql';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'administracion@acceso.interno') THEN
    RAISE EXCEPTION 'No existe administracion@acceso.interno: entra una vez al panel con la clave de admin y vuelve a correr esto';
  END IF;
END $$;

UPDATE simulaciones
SET ejecutivo_id = (SELECT id FROM ejecutivos WHERE nombre = 'Oscar (pruebas)'),
    user_id      = (SELECT id FROM users WHERE email = 'administracion@acceso.interno');

COMMIT;

-- PASO 3, COMPROBAR: la consulta del paso 1 otra vez. Debe quedar una sola fila,
-- Oscar (pruebas) / administracion@acceso.interno, con el total completo.
--
-- Y entrando al portal con la clave de ejecutivo, el historial debe decir 0 / 500.
