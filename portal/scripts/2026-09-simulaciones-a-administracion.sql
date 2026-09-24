-- Todo lo generado hasta hoy pasa a Administración, para que los ejecutivos arranquen
-- el contador del mes en cero sin que se pierda nada del historial.
-- Correr UNA vez contra la base de producción, después de crear un branch de respaldo en Neon.
-- Las migraciones de drizzle/ están desfasadas de la base (se usó db:push), por eso va a mano.
--
-- Contexto: desde el commit que separa el conteo, la cuota mensual se cuenta por
-- `simulaciones.user_id`, que es la cuenta de sistema de la clave con la que se generó
-- (lib/acceso.ts). Mover el user_id es lo que pone a los ejecutivos en cero; mover el
-- ejecutivo_id a NULL es lo que hace que el historial las muestre como "Administración".

-- PRIMERO, MIRAR: cuántas filas se van a mover y de quién son ahora.
-- Correr esto solo y confirmar los números antes de seguir.
SELECT
  COALESCE(e.nombre, 'Administración')                     AS ejecutivo_actual,
  u.email                                                  AS clave_actual,
  count(*) FILTER (WHERE s.creado_en >= date_trunc('month', now())) AS este_mes,
  count(*)                                                 AS total
FROM simulaciones s
LEFT JOIN ejecutivos e ON e.id = s.ejecutivo_id
LEFT JOIN users u      ON u.id = s.user_id
GROUP BY 1, 2
ORDER BY total DESC;

-- DESPUÉS, MOVER.
BEGIN;

UPDATE simulaciones
SET ejecutivo_id = NULL,
    user_id = (SELECT id FROM users WHERE email = 'administracion@acceso.interno')
WHERE user_id IS DISTINCT FROM (SELECT id FROM users WHERE email = 'administracion@acceso.interno')
   OR ejecutivo_id IS NOT NULL;

COMMIT;

-- COMPROBAR: la primera consulta otra vez. Debe quedar una sola fila,
-- Administración / administracion@acceso.interno, con el total completo.
--
-- Y que el simulador entrando con la clave de ejecutivo muestre 0 de 500 este mes.
--
-- Nota: la cuenta 'administracion@acceso.interno' se crea la primera vez que alguien
-- entra con la clave de admin. Si el UPDATE deja user_id en NULL, es que nadie ha
-- entrado todavía con esa clave: entrar una vez al panel y volver a correrlo.
