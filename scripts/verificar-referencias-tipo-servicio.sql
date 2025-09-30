-- Script para verificar qué registros están referenciando un tipo de servicio específico
-- Reemplaza 'ID_DEL_TIPO_SERVICIO' con el ID real del tipo de servicio que intentas eliminar

-- ====================================
-- IDENTIFICAR EL TIPO DE SERVICIO
-- ====================================

DO $$
DECLARE
    tipo_servicio_id UUID := '0e0e9a9c-d050-4aea-bda5-a1a3aa60975c'; -- ID del error
    tipo_nombre VARCHAR;
    referencias_servicios INTEGER := 0;
    referencias_financiero INTEGER := 0;
    referencias_total INTEGER := 0;
BEGIN
    -- Obtener el nombre del tipo de servicio
    SELECT nombre INTO tipo_nombre 
    FROM tipos_servicio 
    WHERE id = tipo_servicio_id;
    
    IF tipo_nombre IS NOT NULL THEN
        RAISE NOTICE '🔍 ANALIZANDO TIPO DE SERVICIO: % (ID: %)', tipo_nombre, tipo_servicio_id;
    ELSE
        RAISE NOTICE '❌ No se encontró el tipo de servicio con ID: %', tipo_servicio_id;
        RETURN;
    END IF;
    
    -- Verificar referencias en embarques_servicios
    SELECT COUNT(*) INTO referencias_servicios
    FROM embarques_servicios
    WHERE tipo_servicio_id = tipo_servicio_id;
    
    -- Verificar referencias en embarques_financiero (si existe la columna tipo_servicio_id)
    SELECT COUNT(*) INTO referencias_financiero
    FROM embarques_financiero
    WHERE tipo_servicio_id = tipo_servicio_id;
    
    referencias_total := referencias_servicios + referencias_financiero;
    
    RAISE NOTICE '📊 REFERENCIAS ENCONTRADAS:';
    RAISE NOTICE '   embarques_servicios: % registros', referencias_servicios;
    RAISE NOTICE '   embarques_financiero: % registros', referencias_financiero;
    RAISE NOTICE '   TOTAL: % registros', referencias_total;
    
    IF referencias_total = 0 THEN
        RAISE NOTICE '✅ No hay referencias - El tipo de servicio puede ser eliminado';
    ELSE
        RAISE NOTICE '⚠️  HAY REFERENCIAS ACTIVAS - Se requiere limpieza antes de eliminar';
    END IF;
END $$;

-- ====================================
-- MOSTRAR DETALLES DE EMBARQUES AFECTADOS
-- ====================================

-- Embarques en embarques_servicios que referencian este tipo
SELECT 
    'embarques_servicios' as tabla,
    es.id as registro_id,
    es.embarque_id,
    ec.folio as folio_embarque,
    ts.nombre as tipo_servicio_nombre,
    es.precio_flete,
    es.flete_falso,
    es.created_at
FROM embarques_servicios es
JOIN embarques_core ec ON es.embarque_id = ec.id
JOIN tipos_servicio ts ON es.tipo_servicio_id = ts.id
WHERE es.tipo_servicio_id = '0e0e9a9c-d050-4aea-bda5-a1a3aa60975c'
ORDER BY es.created_at DESC;

-- Embarques en embarques_financiero que referencian este tipo
SELECT 
    'embarques_financiero' as tabla,
    ef.id as registro_id,
    ef.embarque_id,
    ec.folio as folio_embarque,
    ts.nombre as tipo_servicio_nombre,
    ef.tipo_servicio_precio,
    ef.tipo_servicio_nombre as nombre_guardado,
    ef.precio_operador_final,
    ef.created_at
FROM embarques_financiero ef
JOIN embarques_core ec ON ef.embarque_id = ec.id
LEFT JOIN tipos_servicio ts ON ef.tipo_servicio_id = ts.id
WHERE ef.tipo_servicio_id = '0e0e9a9c-d050-4aea-bda5-a1a3aa60975c'
ORDER BY ef.created_at DESC;

-- ====================================
-- ANÁLISIS ADICIONAL
-- ====================================

-- Verificar si hay embarques con este tipo de servicio en la tabla original
SELECT 
    'embarques_original' as tabla,
    COUNT(*) as total_referencias,
    'Revisar si hay migración pendiente' as observacion
FROM embarques 
WHERE tipo_servicio_id = '0e0e9a9c-d050-4aea-bda5-a1a3aa60975c';