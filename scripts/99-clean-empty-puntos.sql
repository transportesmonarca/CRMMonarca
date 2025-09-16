-- Script: 99-clean-empty-puntos.sql
-- Propósito: Eliminar la clave "puntos" dentro de `observaciones` cuando
-- los arrays `recolectas` y `entregas` no contienen ninguna dirección no vacía.
-- Uso: Ejecutar en el editor SQL de Supabase o con psql apuntando a la BD.

-- -------- PREVIEW (OPCIONAL) --------
-- Ejecuta esta consulta primero para revisar qué registros se verán afectados.
-- SELECT id, observaciones
-- FROM embarques
-- WHERE observaciones IS NOT NULL
--   AND (observaciones::jsonb ? 'puntos')
--   AND NOT EXISTS (
--     SELECT 1 FROM jsonb_array_elements(coalesce(observaciones::jsonb->'puntos'->'recolectas','[]'::jsonb)) elem
--     WHERE trim(coalesce(elem->>'direccion','')) <> ''
--   )
--   AND NOT EXISTS (
--     SELECT 1 FROM jsonb_array_elements(coalesce(observaciones::jsonb->'puntos'->'entregas','[]'::jsonb)) elem
--     WHERE trim(coalesce(elem->>'direccion','')) <> ''
--   );

BEGIN;

WITH updated AS (
  UPDATE embarques
  SET observaciones = (observaciones::jsonb - 'puntos')::text
  WHERE observaciones IS NOT NULL
    AND (observaciones::jsonb ? 'puntos')
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(coalesce(observaciones::jsonb->'puntos'->'recolectas','[]'::jsonb)) elem
      WHERE trim(coalesce(elem->>'direccion','')) <> ''
    )
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(coalesce(observaciones::jsonb->'puntos'->'entregas','[]'::jsonb)) elem
      WHERE trim(coalesce(elem->>'direccion','')) <> ''
    )
  RETURNING id
)
SELECT count(*) AS updated_rows FROM updated;

COMMIT;

-- Nota:
-- - Si tu columna `observaciones` ya es de tipo jsonb, puedes quitar los casts a ::jsonb y ::text.
-- - Haz una copia de seguridad antes de ejecutar en producción.
-- - Si prefieres ejecutar sólo la selección de preview, descomenta la sección PREVIEW y ejecútala primero.
