-- 99-normalize-dates-clean-contactos.sql
-- Propósito: respaldar y normalizar campos de fecha (fecha_recolecta/fecha_entrega) y limpiar
-- la columna contactos_emergencia en la tabla operadores.
-- INSTRUCCIONES: 1) Revisa la sección que corresponde a tu esquema (types) y ejecuta solo esa sección.
--              2) Haz un backup de la base de datos antes de ejecutar.
--              3) Idealmente ejecuta en entorno de staging primero.

BEGIN;

--------------------------------------------------------------------------------
-- 0) Inspección (ejecuta esto primero para ver tipos y muestras)
--------------------------------------------------------------------------------
-- Ver tipos de columnas
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name IN ('embarques','operadores') ORDER BY column_name;

-- Muestra ejemplos
-- SELECT id, fecha_recolecta, fecha_entrega FROM embarques LIMIT 20;
-- SELECT id, contactos_emergencia FROM operadores LIMIT 20;

--------------------------------------------------------------------------------
-- 1) BACKUP de columnas críticas (crea columnas backup si no existen)
--------------------------------------------------------------------------------
ALTER TABLE IF EXISTS embarques ADD COLUMN IF NOT EXISTS fecha_recolecta_backup text;
ALTER TABLE IF EXISTS embarques ADD COLUMN IF NOT EXISTS fecha_entrega_backup text;

UPDATE embarques
SET fecha_recolecta_backup = COALESCE(fecha_recolecta_backup, fecha_recolecta::text),
    fecha_entrega_backup   = COALESCE(fecha_entrega_backup, fecha_entrega::text)
WHERE TRUE;

ALTER TABLE IF EXISTS operadores ADD COLUMN IF NOT EXISTS contactos_emergencia_backup jsonb;
UPDATE operadores
SET contactos_emergencia_backup = COALESCE(contactos_emergencia_backup, contactos_emergencia::jsonb)
WHERE contactos_emergencia IS NOT NULL AND contactos_emergencia_backup IS NULL;

--------------------------------------------------------------------------------
-- 2) NORMALIZAR FECHAS en `embarques`
-- Elige solo la sección que coincida con el tipo de tus columnas.
--------------------------------------------------------------------------------

-- 2A) Si las columnas son TIMESTAMP WITH TIME ZONE (timestamptz):
-- Queremos convertir a DATE según la zona 'America/Matamoros' y dejar formato YYYY-MM-DD.
-- EJECUTAR SI `pg_typeof(fecha_recolecta)` = 'timestamp with time zone'

-- Actualiza a columna temporal de tipo date
ALTER TABLE IF EXISTS embarques ADD COLUMN IF NOT EXISTS fecha_recolecta_norm date;
ALTER TABLE IF EXISTS embarques ADD COLUMN IF NOT EXISTS fecha_entrega_norm date;

UPDATE embarques
SET fecha_recolecta_norm = (fecha_recolecta AT TIME ZONE 'America/Matamoros')::date,
    fecha_entrega_norm   = (fecha_entrega   AT TIME ZONE 'America/Matamoros')::date
WHERE fecha_recolecta IS NOT NULL OR fecha_entrega IS NOT NULL;

-- Si todo OK, puedes reemplazar las columnas originales (opcional):
-- ALTER TABLE embarques DROP COLUMN fecha_recolecta;
-- ALTER TABLE embarques DROP COLUMN fecha_entrega;
-- ALTER TABLE embarques RENAME COLUMN fecha_recolecta_norm TO fecha_recolecta;
-- ALTER TABLE embarques RENAME COLUMN fecha_entrega_norm TO fecha_entrega;

-- 2B) Si las columnas son TIMESTAMP WITHOUT TIME ZONE (timestamp):
-- Interpretaremos el valor como si fuera en UTC y lo convertiremos a Matamoros date.
-- EJECUTAR SI `pg_typeof(fecha_recolecta)` = 'timestamp without time zone'

-- (Descomentar y ejecutar si aplica)
-- UPDATE embarques
-- SET fecha_recolecta = ( (fecha_recolecta AT TIME ZONE 'UTC') AT TIME ZONE 'America/Matamoros')::date,
--     fecha_entrega   = ( (fecha_entrega   AT TIME ZONE 'UTC') AT TIME ZONE 'America/Matamoros')::date
-- WHERE fecha_recolecta IS NOT NULL OR fecha_entrega IS NOT NULL;

-- 2C) Si las columnas son TEXT/VARCHAR con ISO datetimes o fechas:
-- Intentamos parsear ISO datetimes y extraer la fecha en Matamoros.
-- EJECUTAR SÓLO SI columnas son tipo text

-- (Descomentar y ejecutar si aplica)
-- UPDATE embarques
-- SET fecha_recolecta = (
--   CASE
--     WHEN fecha_recolecta ~ '^\d{4}-\d{2}-\d{2}$' THEN fecha_recolecta::date
--     ELSE to_char((fecha_recolecta::timestamptz AT TIME ZONE 'America/Matamoros')::date, 'YYYY-MM-DD')
--   END
-- ),
-- fecha_entrega = (
--   CASE
--     WHEN fecha_entrega ~ '^\d{4}-\d{2}-\d{2}$' THEN fecha_entrega::date
--     ELSE to_char((fecha_entrega::timestamptz AT TIME ZONE 'America/Matamoros')::date, 'YYYY-MM-DD')
--   END
-- )
-- WHERE (fecha_recolecta IS NOT NULL AND fecha_recolecta <> '') OR (fecha_entrega IS NOT NULL AND fecha_entrega <> '');

--------------------------------------------------------------------------------
-- 3) LIMPIEZA DE `contactos_emergencia` en `operadores`
-- Requiere que `contactos_emergencia` sea JSONB (si es TEXT con JSON, primero convertir a JSONB)
--------------------------------------------------------------------------------

-- 3A) Si la columna es text con JSON: convertir a jsonb (haz backup antes)
-- (Descomentar y ejecutar si aplica)
-- ALTER TABLE operadores ALTER COLUMN contactos_emergencia TYPE jsonb USING contactos_emergencia::jsonb;

-- 3B) Normalizar arrays: eliminar elementos vacíos (todos los campos vacíos o nulos), recortar a máximo 5.
-- Además quitamos espacios en blanco de strings.
UPDATE operadores
SET contactos_emergencia = (
  SELECT COALESCE(jsonb_agg(clean_elem ORDER BY elem_idx), '[]'::jsonb)
  FROM (
    SELECT elem_idx, jsonb_build_object(
      'nombre', trim(coalesce(elem->> 'nombre','')),
      'relacion', trim(coalesce(elem->> 'relacion','')),
      'direccion', trim(coalesce(elem->> 'direccion','')),
      'telefono', trim(coalesce(elem->> 'telefono','')),
      'correo', trim(coalesce(elem->> 'correo',''))
    ) as clean_elem
    FROM (
      SELECT row_number() OVER () as elem_idx, elem
      FROM jsonb_array_elements(coalesce(contactos_emergencia, '[]'::jsonb)) WITH ORDINALITY arr(elem, ord)
    ) s
    WHERE (
      (trim(coalesce((elem->>'nombre'),'')) <> '') OR
      (trim(coalesce((elem->>'relacion'),'')) <> '') OR
      (trim(coalesce((elem->>'direccion'),'')) <> '') OR
      (trim(coalesce((elem->>'telefono'),'')) <> '') OR
      (trim(coalesce((elem->>'correo'),'')) <> '')
    )
    ORDER BY elem_idx
    LIMIT 5
  ) x
)
WHERE contactos_emergencia IS NOT NULL;

-- Convert empty arrays to NULL to reflect "no contactos"
UPDATE operadores SET contactos_emergencia = NULL WHERE contactos_emergencia = '[]'::jsonb;

--------------------------------------------------------------------------------
-- 4) Verificaciones rápidas
--------------------------------------------------------------------------------
-- SELECT id, fecha_recolecta, fecha_entrega, fecha_recolecta_backup, fecha_entrega_backup FROM embarques ORDER BY id DESC LIMIT 20;
-- SELECT id, contactos_emergencia, contactos_emergencia_backup FROM operadores ORDER BY id DESC LIMIT 20;

COMMIT;

-- NOTAS:
-- - Este script intenta ser conservador: crea backups y deja columnas temporales cuando aplica.
-- - Ejecuta solo las secciones que aplican a tu esquema. Si no sabes, primero ejecuta las consultas de INSPECCIÓN.
-- - Revisa resultados en un subset antes de correr en toda la tabla (ej. agregar WHERE id IN (...)).
-- - Si necesitas, puedo adaptar el script para tu esquema exacto (indícame el resultado de:
--   SELECT column_name, data_type FROM information_schema.columns WHERE table_name IN ('embarques','operadores');
