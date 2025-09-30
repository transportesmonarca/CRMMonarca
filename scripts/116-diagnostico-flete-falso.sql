-- Script 116: Diagnóstico del problema de flete falso
-- Revisar exactamente cómo se están almacenando y consultando los datos

-- ====================================
-- 1. REVISAR ESTRUCTURA DE TABLAS
-- ====================================

-- Verificar columnas en embarques_financiero
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'embarques_financiero' 
    AND column_name IN ('pago_operador', 'flete_falso', 'tipo_servicio_precio', 'tipo_servicio_nombre', 'precio_operador_final')
ORDER BY ordinal_position;

-- Verificar columnas en embarques_modificaciones
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'embarques_modificaciones' 
    AND column_name IN ('flete_en_falso')
ORDER BY ordinal_position;

-- ====================================
-- 2. VERIFICAR DATOS EXISTENTES
-- ====================================

-- Buscar embarques marcados como flete falso en embarques_financiero
SELECT 
    en.folio,
    ef.embarque_id,
    ef.pago_operador,
    ef.flete_falso,
    ef.tipo_servicio_precio,
    ef.tipo_servicio_nombre,
    ef.precio_operador_final,
    ef.updated_at
FROM embarques_financiero ef
JOIN embarques_nuevo en ON en.id = ef.embarque_id
WHERE ef.flete_falso = true
ORDER BY ef.updated_at DESC
LIMIT 10;

-- Buscar modificaciones con flete en falso
SELECT 
    em.embarque_id,
    en.folio,
    em.flete_en_falso,
    em.fecha_modificacion,
    em.operador_original_nombre,
    em.operador_nuevo_nombre,
    em.razon
FROM embarques_modificaciones em
JOIN embarques_nuevo en ON en.id = em.embarque_id
WHERE em.flete_en_falso = true
ORDER BY em.fecha_modificacion DESC
LIMIT 10;

-- ====================================
-- 3. COMPROBAR INCONSISTENCIAS
-- ====================================

-- Buscar embarques donde flete_falso está marcado pero precio_operador_final es 0
SELECT 
    en.folio,
    ef.embarque_id,
    ef.pago_operador,
    ef.flete_falso,
    ef.precio_operador_final,
    ts.nombre as tipo_servicio_nombre,
    ts.precio_base as tipo_servicio_precio
FROM embarques_financiero ef
JOIN embarques_nuevo en ON en.id = ef.embarque_id
LEFT JOIN tipos_servicios ts ON ts.id = en.tipo_servicio_id
WHERE ef.flete_falso = true 
    AND COALESCE(ef.precio_operador_final, 0) = 0
ORDER BY ef.updated_at DESC;

-- ====================================
-- 4. REVISAR PRECIO GLOBAL DE FLETE FALSO
-- ====================================

SELECT nombre, valor, fecha_actualizacion, updated_by
FROM configuraciones 
WHERE nombre = 'flete_falso_precio_global';

-- ====================================
-- 5. REVISAR FUNCIONAMIENTO DE LAS FUNCIONES
-- ====================================

-- Probar la función calcular_pago_operador_normalizado con un embarque de flete falso
SELECT 
    en.folio,
    ef.flete_falso,
    ef.pago_operador,
    ef.precio_operador_final,
    calcular_pago_operador_normalizado(en.id) as pago_calculado_funcion
FROM embarques_nuevo en
JOIN embarques_financiero ef ON ef.embarque_id = en.id
WHERE ef.flete_falso = true
ORDER BY ef.updated_at DESC
LIMIT 5;

-- ====================================
-- 6. REVISAR VISTA EMBARQUES_COMPLETA
-- ====================================

SELECT 
    folio,
    pago_operador,
    flete_falso,
    tipo_servicio_precio,
    tipo_servicio_nombre,
    precio_operador_final
FROM embarques_completa 
WHERE flete_falso = true
ORDER BY created_at DESC
LIMIT 5;

-- ====================================
-- 7. BUSCAR EMBARQUES CON PRECIO 666
-- ====================================

-- En embarques_financiero
SELECT 
    en.folio,
    ef.pago_operador,
    ef.flete_falso,
    ef.precio_operador_final
FROM embarques_financiero ef
JOIN embarques_nuevo en ON en.id = ef.embarque_id
WHERE ef.pago_operador = 666 OR ef.precio_operador_final = 666
ORDER BY ef.updated_at DESC;

-- En vista embarques_completa
SELECT 
    folio,
    pago_operador,
    flete_falso,
    precio_operador_final
FROM embarques_completa 
WHERE pago_operador = 666 OR precio_operador_final = 666
ORDER BY created_at DESC;

-- ====================================
-- MENSAJE DE DIAGNÓSTICO
-- ====================================

DO $$
BEGIN
    RAISE NOTICE '🔍 DIAGNÓSTICO DE FLETE FALSO COMPLETADO';
    RAISE NOTICE '📋 Revisa los resultados para identificar:';
    RAISE NOTICE '   1. Si las columnas existen correctamente';
    RAISE NOTICE '   2. Si los datos se están guardando correctamente';
    RAISE NOTICE '   3. Si hay inconsistencias entre tablas';
    RAISE NOTICE '   4. Si las funciones están calculando correctamente';
    RAISE NOTICE '   5. Si la vista está mostrando los datos correctos';
END $$;