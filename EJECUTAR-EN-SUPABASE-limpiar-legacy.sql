-- ====================================
-- LIMPIAR EMBARQUES LEGACY DESPUÉS DE MIGRACIÓN
-- ====================================
-- EJECUTAR SOLO DESPUÉS DE VERIFICAR QUE LA MIGRACIÓN FUE EXITOSA

-- Verificar primero que están en tablas normalizadas
DO $$
DECLARE
    count_normalizada INTEGER := 0;
    count_legacy INTEGER := 0;
BEGIN
    -- Contar en tablas normalizadas
    SELECT COUNT(*) INTO count_normalizada 
    FROM embarques_nuevo 
    WHERE folio IN ('TIM-2509-037', 'TIM-2509-038');
    
    -- Contar en tabla legacy
    SELECT COUNT(*) INTO count_legacy 
    FROM embarques 
    WHERE folio IN ('TIM-2509-037', 'TIM-2509-038');
    
    RAISE NOTICE '📊 VERIFICACIÓN ANTES DE LIMPIAR:';
    RAISE NOTICE '   En tablas normalizadas: %', count_normalizada;
    RAISE NOTICE '   En tabla legacy: %', count_legacy;
    
    -- Solo proceder si están en tablas normalizadas
    IF count_normalizada >= 2 AND count_legacy >= 2 THEN
        RAISE NOTICE '✅ CONDICIONES CUMPLIDAS - Procediendo con limpieza...';
        
        -- Eliminar de tabla legacy
        DELETE FROM embarques 
        WHERE folio IN ('TIM-2509-037', 'TIM-2509-038');
        
        -- Verificar eliminación
        SELECT COUNT(*) INTO count_legacy 
        FROM embarques 
        WHERE folio IN ('TIM-2509-037', 'TIM-2509-038');
        
        RAISE NOTICE '🧹 LIMPIEZA COMPLETADA';
        RAISE NOTICE '   Embarques eliminados de tabla legacy: %', count_legacy = 0;
        RAISE NOTICE '✅ Los embarques ahora están SOLO en tablas normalizadas';
        
    ELSE
        RAISE NOTICE '⚠️  NO SE PUEDE LIMPIAR:';
        IF count_normalizada < 2 THEN
            RAISE NOTICE '   ❌ Faltan embarques en tablas normalizadas (% de 2)', count_normalizada;
        END IF;
        IF count_legacy < 2 THEN
            RAISE NOTICE '   ❌ No hay embarques en tabla legacy para limpiar';
        END IF;
        RAISE NOTICE '   💡 Ejecuta primero el script de migración';
    END IF;
END $$;