-- Script: 49-add-pago-operador-embarques.sql
-- Propósito: Añadir columna `pago_operador` a la tabla `embarques` y opcionalmente
--            backfill (popular) los valores históricos desde `tipos_servicio.precio_base`.
-- Nota importante:
--  - Si eliges ejecutar la sección de backfill, se usará el valor actual de
--    `tipos_servicio.precio_base` para fijar el pago histórico. Si tu intención
--    es preservar el valor «original» al crear el embarque y no tienes ese
--    dato almacenado, no es posible recuperar el valor exacto sin registro
--    adicional. El backfill es una opción práctica para dejar un snapshot
--    consistente de los pagos a partir de la data disponible.
--  - Recomendación: ejecutar primero la sección A (ALTER TABLE) en producción,
--    verificar que la aplicación (nuevas asignaciones) persiste `pago_operador`,
--    y luego optar por ejecutar la sección B (backfill) si quieres fijar los
--    valores históricos.
--  - Ejecutar en Supabase SQL editor o con psql dentro de una transacción si lo deseas.

BEGIN;

-- =====================================================
-- SECCIÓN A: Añadir columna (no destructiva)
-- =====================================================
-- Esta instrucción agrega la columna (nullable). No se tocan datos existentes.
ALTER TABLE public.embarques
  ADD COLUMN IF NOT EXISTS pago_operador numeric;

-- Opcional: índice si planeas filtrar/consultar por esta columna frecuentemente
-- CREATE INDEX IF NOT EXISTS idx_embarques_pago_operador ON public.embarques (pago_operador);

-- =====================================================
-- SECCIÓN B (OPCIONAL): Backfill de valores históricos
-- =====================================================
-- Si deseas fijar un valor histórico para embarques existentes, descomenta
-- la UPDATE siguiente y ejecútala. El valor asignado será el precio_base
-- actual del tipo de servicio referenciado por cada embarque.
-- ADVERTENCIA: esto fija datos históricos de forma irreversible a menos que
-- hagas un backup previo.

-- UPDATE public.embarques e
-- SET pago_operador = COALESCE(
--     (
--       SELECT precio_base::numeric FROM public.tipos_servicio ts WHERE ts.id = e.tipo_servicio_id
--     ),
--     0
-- )
-- WHERE e.pago_operador IS NULL AND e.tipo_servicio_id IS NOT NULL;

-- =====================================================
-- SECCIÓN C: Comprobaciones rápidas
-- =====================================================
-- 1) Contar cuántos embarques tienen pago_operador null
-- SELECT COUNT(*) AS sin_pago_persistido FROM public.embarques WHERE pago_operador IS NULL;

-- 2) Mostrar una muestra (10) de embarques con su tipo y precio_base para verificar
-- SELECT e.id, e.folio, e.tipo_servicio_id, e.pago_operador, ts.precio_base
-- FROM public.embarques e
-- LEFT JOIN public.tipos_servicio ts ON ts.id = e.tipo_servicio_id
-- ORDER BY e.fecha_creacion DESC
-- LIMIT 10;

COMMIT;

-- Fin del script
