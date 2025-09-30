-- Script para eliminar completamente los embarques TIM-2509-023 y TIM-2509-022
-- Este script elimina los registros de todas las tablas relacionadas

-- ====================================
-- IDENTIFICAR EMBARQUES A ELIMINAR
-- ====================================

-- Primero verificar que existen los embarques
DO $$
DECLARE
    embarque_023_id UUID;
    embarque_022_id UUID;
    embarque_023_count INTEGER := 0;
    embarque_022_count INTEGER := 0;
BEGIN
    -- Buscar TIM-2509-023
    SELECT id INTO embarque_023_id 
    FROM embarques_nuevo 
    WHERE folio = 'TIM-2509-023' 
    LIMIT 1;
    
    -- Buscar TIM-2509-022
    SELECT id INTO embarque_022_id 
    FROM embarques_nuevo 
    WHERE folio = 'TIM-2509-022' 
    LIMIT 1;
    
    -- Verificar existencia
    IF embarque_023_id IS NOT NULL THEN
        embarque_023_count := 1;
        RAISE NOTICE '✅ Encontrado TIM-2509-023 con ID: %', embarque_023_id;
    ELSE
        RAISE NOTICE '⚠️  No se encontró TIM-2509-023';
    END IF;
    
    IF embarque_022_id IS NOT NULL THEN
        embarque_022_count := 1;
        RAISE NOTICE '✅ Encontrado TIM-2509-022 con ID: %', embarque_022_id;
    ELSE
        RAISE NOTICE '⚠️  No se encontró TIM-2509-022';
    END IF;
    
    RAISE NOTICE 'Total embarques encontrados para eliminar: %', embarque_023_count + embarque_022_count;
END $$;

-- ====================================
-- ELIMINAR REGISTROS DE TODAS LAS TABLAS
-- ====================================

-- Eliminar de tablas normalizadas (nuevas)
DELETE FROM embarques_adicional 
WHERE embarque_id IN (
    SELECT id FROM embarques_nuevo WHERE folio IN ('TIM-2509-023', 'TIM-2509-022')
);

DELETE FROM embarques_documentos 
WHERE embarque_id IN (
    SELECT id FROM embarques_nuevo WHERE folio IN ('TIM-2509-023', 'TIM-2509-022')
);

DELETE FROM embarques_estado 
WHERE embarque_id IN (
    SELECT id FROM embarques_nuevo WHERE folio IN ('TIM-2509-023', 'TIM-2509-022')
);

DELETE FROM embarques_financiero 
WHERE embarque_id IN (
    SELECT id FROM embarques_nuevo WHERE folio IN ('TIM-2509-023', 'TIM-2509-022')
);

DELETE FROM embarques_ubicaciones 
WHERE embarque_id IN (
    SELECT id FROM embarques_nuevo WHERE folio IN ('TIM-2509-023', 'TIM-2509-022')
);

-- Eliminar de tabla principal normalizada
DELETE FROM embarques_nuevo 
WHERE folio IN ('TIM-2509-023', 'TIM-2509-022');

-- Eliminar de tabla original (si existen)
DELETE FROM embarques 
WHERE folio IN ('TIM-2509-023', 'TIM-2509-022');

-- ====================================
-- VERIFICAR ELIMINACIÓN
-- ====================================

DO $$
DECLARE
    count_nuevo INTEGER := 0;
    count_original INTEGER := 0;
    count_ubicaciones INTEGER := 0;
    count_financiero INTEGER := 0;
    count_estado INTEGER := 0;
    count_documentos INTEGER := 0;
    count_adicional INTEGER := 0;
BEGIN
    -- Verificar en tablas normalizadas
    SELECT COUNT(*) INTO count_nuevo 
    FROM embarques_nuevo 
    WHERE folio IN ('TIM-2509-023', 'TIM-2509-022');
    
    SELECT COUNT(*) INTO count_ubicaciones 
    FROM embarques_ubicaciones u
    JOIN embarques_nuevo e ON u.embarque_id = e.id
    WHERE e.folio IN ('TIM-2509-023', 'TIM-2509-022');
    
    SELECT COUNT(*) INTO count_financiero 
    FROM embarques_financiero f
    JOIN embarques_nuevo e ON f.embarque_id = e.id
    WHERE e.folio IN ('TIM-2509-023', 'TIM-2509-022');
    
    SELECT COUNT(*) INTO count_estado 
    FROM embarques_estado es
    JOIN embarques_nuevo e ON es.embarque_id = e.id
    WHERE e.folio IN ('TIM-2509-023', 'TIM-2509-022');
    
    SELECT COUNT(*) INTO count_documentos 
    FROM embarques_documentos d
    JOIN embarques_nuevo e ON d.embarque_id = e.id
    WHERE e.folio IN ('TIM-2509-023', 'TIM-2509-022');
    
    SELECT COUNT(*) INTO count_adicional 
    FROM embarques_adicional a
    JOIN embarques_nuevo e ON a.embarque_id = e.id
    WHERE e.folio IN ('TIM-2509-023', 'TIM-2509-022');
    
    -- Verificar en tabla original
    SELECT COUNT(*) INTO count_original 
    FROM embarques 
    WHERE folio IN ('TIM-2509-023', 'TIM-2509-022');
    
    -- Mostrar resultados
    RAISE NOTICE '📊 VERIFICACIÓN DE ELIMINACIÓN:';
    RAISE NOTICE '   embarques_nuevo: % registros restantes', count_nuevo;
    RAISE NOTICE '   embarques_ubicaciones: % registros restantes', count_ubicaciones;
    RAISE NOTICE '   embarques_financiero: % registros restantes', count_financiero;
    RAISE NOTICE '   embarques_estado: % registros restantes', count_estado;
    RAISE NOTICE '   embarques_documentos: % registros restantes', count_documentos;
    RAISE NOTICE '   embarques_adicional: % registros restantes', count_adicional;
    RAISE NOTICE '   embarques (original): % registros restantes', count_original;
    
    IF (count_nuevo + count_ubicaciones + count_financiero + count_estado + count_documentos + count_adicional + count_original) = 0 THEN
        RAISE NOTICE '✅ ELIMINACIÓN COMPLETADA EXITOSAMENTE';
        RAISE NOTICE '🗑️  Los embarques TIM-2509-023 y TIM-2509-022 han sido eliminados completamente';
    ELSE
        RAISE NOTICE '⚠️  Algunos registros no fueron eliminados completamente';
    END IF;
END $$;