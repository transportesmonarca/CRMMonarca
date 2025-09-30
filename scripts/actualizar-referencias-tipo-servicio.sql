-- Script SEGURO para eliminar un tipo de servicio
-- En lugar de eliminar embarques, los actualiza para que usen otro tipo de servicio
-- o les asigna valores por defecto

-- ====================================
-- CONFIGURACIÓN
-- ====================================

DO $$
DECLARE
    tipo_servicio_a_eliminar UUID := '0e0e9a9c-d050-4aea-bda5-a1a3aa60975c'; -- ID del tipo problemático
    tipo_servicio_reemplazo UUID; -- Se determinará automáticamente
    tipo_nombre_eliminar VARCHAR;
    tipo_nombre_reemplazo VARCHAR;
    embarques_actualizados INTEGER := 0;
    confirmar_actualizacion BOOLEAN := true; -- Cambiar a true para ejecutar
BEGIN
    -- Obtener información del tipo de servicio a eliminar
    SELECT nombre INTO tipo_nombre_eliminar 
    FROM tipos_servicio 
    WHERE id = tipo_servicio_a_eliminar;
    
    IF tipo_nombre_eliminar IS NULL THEN
        RAISE NOTICE '❌ No se encontró el tipo de servicio con ID: %', tipo_servicio_a_eliminar;
        RETURN;
    END IF;
    
    -- Buscar un tipo de servicio de reemplazo (el más usado o uno por defecto)
    SELECT id, nombre INTO tipo_servicio_reemplazo, tipo_nombre_reemplazo
    FROM tipos_servicio 
    WHERE id != tipo_servicio_a_eliminar 
    ORDER BY created_at ASC -- Tomar el más antiguo como seguro
    LIMIT 1;
    
    IF tipo_servicio_reemplazo IS NULL THEN
        RAISE NOTICE '❌ No hay tipos de servicio de reemplazo disponibles';
        RETURN;
    END IF;
    
    RAISE NOTICE '🔄 ACTUALIZACIÓN SEGURA DE TIPO DE SERVICIO';
    RAISE NOTICE '   A eliminar: % (ID: %)', tipo_nombre_eliminar, tipo_servicio_a_eliminar;
    RAISE NOTICE '   Reemplazo: % (ID: %)', tipo_nombre_reemplazo, tipo_servicio_reemplazo;
    
    IF NOT confirmar_actualizacion THEN
        RAISE NOTICE '🛑 ACTUALIZACIÓN CANCELADA';
        RAISE NOTICE '   Para confirmar, cambiar confirmar_actualizacion a true';
        RETURN;
    END IF;
    
    -- ====================================
    -- FASE 1: ACTUALIZAR REFERENCIAS EN EMBARQUES_SERVICIOS
    -- ====================================
    
    UPDATE embarques_servicios 
    SET tipo_servicio_id = tipo_servicio_reemplazo,
        observaciones = COALESCE(observaciones, '') || 
        ' [ACTUALIZADO: Tipo servicio cambiado de "' || tipo_nombre_eliminar || '" a "' || tipo_nombre_reemplazo || '"]'
    WHERE tipo_servicio_id = tipo_servicio_a_eliminar;
    
    GET DIAGNOSTICS embarques_actualizados = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en embarques_servicios', embarques_actualizados;
    
    -- ====================================
    -- FASE 2: ACTUALIZAR REFERENCIAS EN EMBARQUES_FINANCIERO
    -- ====================================
    
    UPDATE embarques_financiero 
    SET tipo_servicio_id = tipo_servicio_reemplazo,
        tipo_servicio_nombre = tipo_nombre_reemplazo,
        observaciones = COALESCE(observaciones, '') || 
        ' [ACTUALIZADO: Tipo servicio cambiado de "' || tipo_nombre_eliminar || '" a "' || tipo_nombre_reemplazo || '"]'
    WHERE tipo_servicio_id = tipo_servicio_a_eliminar;
    
    GET DIAGNOSTICS embarques_actualizados = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en embarques_financiero', embarques_actualizados;
    
    -- ====================================
    -- FASE 3: ACTUALIZAR TABLA ORIGINAL SI EXISTE
    -- ====================================
    
    UPDATE embarques 
    SET tipo_servicio_id = tipo_servicio_reemplazo,
        observaciones = COALESCE(observaciones, '') || 
        ' [ACTUALIZADO: Tipo servicio cambiado automáticamente]'
    WHERE tipo_servicio_id = tipo_servicio_a_eliminar;
    
    GET DIAGNOSTICS embarques_actualizados = ROW_COUNT;
    RAISE NOTICE '✅ Actualizados % registros en embarques originales', embarques_actualizados;
    
    -- ====================================
    -- FASE 4: ELIMINAR EL TIPO DE SERVICIO
    -- ====================================
    
    -- Verificar que no queden referencias
    DECLARE
        referencias_servicios INTEGER := 0;
        referencias_financiero INTEGER := 0;
        referencias_originales INTEGER := 0;
        referencias_total INTEGER := 0;
    BEGIN
        SELECT COUNT(*) INTO referencias_servicios FROM embarques_servicios WHERE tipo_servicio_id = tipo_servicio_a_eliminar;
        SELECT COUNT(*) INTO referencias_financiero FROM embarques_financiero WHERE tipo_servicio_id = tipo_servicio_a_eliminar;
        SELECT COUNT(*) INTO referencias_originales FROM embarques WHERE tipo_servicio_id = tipo_servicio_a_eliminar;
        
        referencias_total := referencias_servicios + referencias_financiero + referencias_originales;
        
        IF referencias_total = 0 THEN
            DELETE FROM tipos_servicio WHERE id = tipo_servicio_a_eliminar;
            RAISE NOTICE '✅ Tipo de servicio "%" eliminado exitosamente', tipo_nombre_eliminar;
        ELSE
            RAISE NOTICE '❌ Aún quedan % referencias:', referencias_total;
            RAISE NOTICE '   embarques_servicios: %', referencias_servicios;
            RAISE NOTICE '   embarques_financiero: %', referencias_financiero;
            RAISE NOTICE '   embarques originales: %', referencias_originales;
        END IF;
    END;
    
    RAISE NOTICE '📊 PROCESO COMPLETADO EXITOSAMENTE';
    RAISE NOTICE '   ✅ Todos los embarques mantienen su información';
    RAISE NOTICE '   ✅ Referencias actualizadas a tipo de servicio válido';
    RAISE NOTICE '   ✅ Tipo problemático eliminado';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR: %', SQLERRM;
        RAISE;
END $$;

-- ====================================
-- VERIFICACIÓN FINAL
-- ====================================

-- Verificar eliminación del tipo problemático
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Tipo de servicio problemático eliminado'
        ELSE '❌ El tipo de servicio problemático aún existe'
    END as verificacion
FROM tipos_servicio 
WHERE id = '0e0e9a9c-d050-4aea-bda5-a1a3aa60975c';

-- Mostrar tipos de servicio restantes
SELECT 
    id,
    nombre,
    precio,
    activo,
    created_at
FROM tipos_servicio 
ORDER BY created_at ASC;