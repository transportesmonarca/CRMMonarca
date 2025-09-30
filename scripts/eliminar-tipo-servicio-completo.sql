-- Script para eliminar completamente un tipo de servicio y todas sus referencias
-- IMPORTANTE: Este script eliminará PERMANENTEMENTE los embarques que usen este tipo de servicio
-- Usar con extrema precaución

-- ====================================
-- CONFIGURACIÓN
-- ====================================

DO $$
DECLARE
    tipo_servicio_id UUID := '0e0e9a9c-d050-4aea-bda5-a1a3aa60975c'; -- ID del tipo de servicio a eliminar
    tipo_nombre VARCHAR;
    embarques_afectados INTEGER := 0;
    registros_eliminados INTEGER := 0;
    confirmar_eliminacion BOOLEAN := false; -- CAMBIAR A true PARA CONFIRMAR LA ELIMINACIÓN
BEGIN
    -- Obtener información del tipo de servicio
    SELECT nombre INTO tipo_nombre 
    FROM tipos_servicio 
    WHERE id = tipo_servicio_id;
    
    IF tipo_nombre IS NULL THEN
        RAISE NOTICE '❌ No se encontró el tipo de servicio con ID: %', tipo_servicio_id;
        RETURN;
    END IF;
    
    RAISE NOTICE '🔥 ELIMINACIÓN COMPLETA DE TIPO DE SERVICIO';
    RAISE NOTICE '   Tipo: % (ID: %)', tipo_nombre, tipo_servicio_id;
    
    -- Contar embarques afectados
    SELECT COUNT(DISTINCT es.embarque_id) INTO embarques_afectados
    FROM embarques_servicios es
    WHERE es.tipo_servicio_id = tipo_servicio_id;
    
    RAISE NOTICE '⚠️  EMBARQUES QUE SERÁN ELIMINADOS: %', embarques_afectados;
    
    IF NOT confirmar_eliminacion THEN
        RAISE NOTICE '🛑 ELIMINACIÓN CANCELADA';
        RAISE NOTICE '   Para confirmar, cambiar confirmar_eliminacion a true en el script';
        RETURN;
    END IF;
    
    RAISE NOTICE '🚀 INICIANDO ELIMINACIÓN...';
    
    -- ====================================
    -- FASE 1: ELIMINAR EMBARQUES COMPLETOS
    -- ====================================
    
    -- Obtener IDs de embarques que usan este tipo de servicio
    FOR embarque_record IN (
        SELECT DISTINCT es.embarque_id, ec.folio
        FROM embarques_servicios es
        JOIN embarques_core ec ON es.embarque_id = ec.id
        WHERE es.tipo_servicio_id = tipo_servicio_id
    ) LOOP
        RAISE NOTICE '🗑️  Eliminando embarque: % (ID: %)', embarque_record.folio, embarque_record.embarque_id;
        
        -- Eliminar de todas las tablas normalizadas
        DELETE FROM embarques_observaciones WHERE embarque_id = embarque_record.embarque_id;
        DELETE FROM embarques_representantes WHERE embarque_id = embarque_record.embarque_id;
        DELETE FROM embarques_pagos WHERE embarque_id = embarque_record.embarque_id;
        DELETE FROM embarques_envios_cliente WHERE embarque_id = embarque_record.embarque_id;
        DELETE FROM embarques_facturacion WHERE embarque_id = embarque_record.embarque_id;
        DELETE FROM embarques_servicios WHERE embarque_id = embarque_record.embarque_id;
        DELETE FROM embarques_logistica WHERE embarque_id = embarque_record.embarque_id;
        DELETE FROM embarques_core WHERE id = embarque_record.embarque_id;
        
        -- Eliminar de tablas de la nueva estructura (si existen)
        DELETE FROM embarques_adicional WHERE embarque_id = embarque_record.embarque_id;
        DELETE FROM embarques_documentos WHERE embarque_id = embarque_record.embarque_id;
        DELETE FROM embarques_estado WHERE embarque_id = embarque_record.embarque_id;
        DELETE FROM embarques_financiero WHERE embarque_id = embarque_record.embarque_id;
        DELETE FROM embarques_ubicaciones WHERE embarque_id = embarque_record.embarque_id;
        DELETE FROM embarques_nuevo WHERE id = embarque_record.embarque_id;
        
        -- Eliminar de tabla original
        DELETE FROM embarques WHERE id = embarque_record.embarque_id;
        
        registros_eliminados := registros_eliminados + 1;
    END LOOP;
    
    -- ====================================
    -- FASE 2: ELIMINAR TIPO DE SERVICIO
    -- ====================================
    
    -- Verificar que no queden referencias
    DECLARE
        referencias_restantes INTEGER := 0;
    BEGIN
        SELECT 
            COALESCE((SELECT COUNT(*) FROM embarques_servicios WHERE tipo_servicio_id = tipo_servicio_id), 0) +
            COALESCE((SELECT COUNT(*) FROM embarques_financiero WHERE tipo_servicio_id = tipo_servicio_id), 0) +
            COALESCE((SELECT COUNT(*) FROM embarques WHERE tipo_servicio_id = tipo_servicio_id), 0)
        INTO referencias_restantes;
        
        IF referencias_restantes = 0 THEN
            DELETE FROM tipos_servicio WHERE id = tipo_servicio_id;
            RAISE NOTICE '✅ Tipo de servicio eliminado exitosamente';
        ELSE
            RAISE NOTICE '❌ Aún quedan % referencias - No se puede eliminar el tipo de servicio', referencias_restantes;
        END IF;
    END;
    
    -- ====================================
    -- REPORTE FINAL
    -- ====================================
    
    RAISE NOTICE '📊 RESUMEN DE ELIMINACIÓN:';
    RAISE NOTICE '   Embarques eliminados: %', registros_eliminados;
    RAISE NOTICE '   Tipo de servicio: % - ELIMINADO', tipo_nombre;
    RAISE NOTICE '✅ ELIMINACIÓN COMPLETA FINALIZADA';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR DURANTE LA ELIMINACIÓN: %', SQLERRM;
        RAISE NOTICE '🔄 La transacción se revertirá automáticamente';
        RAISE;
END $$;

-- ====================================
-- VERIFICACIÓN POST-ELIMINACIÓN
-- ====================================

-- Verificar que el tipo de servicio fue eliminado
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Tipo de servicio eliminado correctamente'
        ELSE '❌ El tipo de servicio aún existe'
    END as verificacion_tipo
FROM tipos_servicio 
WHERE id = '0e0e9a9c-d050-4aea-bda5-a1a3aa60975c';

-- Verificar que no queden referencias
SELECT 
    'embarques_servicios' as tabla,
    COUNT(*) as referencias_restantes
FROM embarques_servicios 
WHERE tipo_servicio_id = '0e0e9a9c-d050-4aea-bda5-a1a3aa60975c'
UNION ALL
SELECT 
    'embarques_financiero' as tabla,
    COUNT(*) as referencias_restantes
FROM embarques_financiero 
WHERE tipo_servicio_id = '0e0e9a9c-d050-4aea-bda5-a1a3aa60975c'
UNION ALL
SELECT 
    'embarques_original' as tabla,
    COUNT(*) as referencias_restantes
FROM embarques 
WHERE tipo_servicio_id = '0e0e9a9c-d050-4aea-bda5-a1a3aa60975c';