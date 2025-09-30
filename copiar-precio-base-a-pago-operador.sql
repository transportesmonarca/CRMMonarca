-- Script para copiar tipos_servicio.precio_base → embarques.pago_operador
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar cuántos embarques no tienen pago_operador
SELECT 
  count(*) as total_embarques,
  count(pago_operador) as con_pago_operador,
  count(*) - count(pago_operador) as sin_pago_operador
FROM embarques;

-- 2. Ver algunos ejemplos de tipos de servicio y sus precios
SELECT 
  ts.id,
  ts.nombre,
  ts.precio_base,
  ts.pago_operador
FROM tipos_servicio ts
WHERE ts.precio_base IS NOT NULL
LIMIT 10;

-- 3. Ver embarques sin pago_operador y sus tipos
SELECT 
  e.id,
  e.folio,
  e.tipo_servicio_id,
  ts.nombre as tipo_servicio_nombre,
  ts.precio_base,
  e.pago_operador
FROM embarques e
LEFT JOIN tipos_servicio ts ON e.tipo_servicio_id = ts.id
WHERE e.pago_operador IS NULL
  AND e.tipo_servicio_id IS NOT NULL
LIMIT 10;

-- 4. ACTUALIZACIÓN MASIVA: Copiar precio_base → pago_operador
-- CUIDADO: Esto afectará TODOS los embarques sin pago_operador
UPDATE embarques 
SET pago_operador = ts.precio_base,
    updated_at = NOW()
FROM tipos_servicio ts
WHERE embarques.tipo_servicio_id = ts.id
  AND embarques.pago_operador IS NULL  -- Solo actualizar los que no tienen valor
  AND ts.precio_base IS NOT NULL       -- Solo si el tipo tiene precio_base
  AND ts.precio_base > 0;              -- Solo valores positivos

-- 5. Verificar resultados después de la actualización
SELECT 
  'Después de actualización' as momento,
  count(*) as total_embarques,
  count(pago_operador) as con_pago_operador,
  count(*) - count(pago_operador) as sin_pago_operador
FROM embarques;

-- 6. Ver ejemplos específicos actualizados
SELECT 
  e.folio,
  ts.nombre as tipo_servicio,
  ts.precio_base as precio_tipo,
  e.pago_operador as pago_embarque,
  e.flete_falso,
  e.estado
FROM embarques e
LEFT JOIN tipos_servicio ts ON e.tipo_servicio_id = ts.id
WHERE e.folio LIKE '%048%'  -- Buscar el embarque específico
   OR e.pago_operador IS NOT NULL
ORDER BY e.folio;

-- 7. CASO ESPECIAL: Actualizar embarques con flete falso al precio configurado
-- (Ejecutar solo si existe la configuración de flete falso)
/*
UPDATE embarques 
SET pago_operador = 666  -- O el valor que tengas configurado para flete falso
WHERE (flete_falso = true OR estado LIKE '%_contingencia_FF')
  AND pago_operador != 666;
*/

-- 8. ELIMINAR TODOS LOS REGISTROS DE LA TABLA EMBARQUES
-- ⚠️ ADVERTENCIA: Esto eliminará TODOS los embarques (datos de prueba)
DELETE FROM embarques;

-- Alternativo (más eficiente para tablas grandes):
-- TRUNCATE TABLE embarques;

-- Verificar que la tabla quedó vacía:
SELECT COUNT(*) as registros_restantes FROM embarques;