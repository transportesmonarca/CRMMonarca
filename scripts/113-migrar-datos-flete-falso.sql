-- Script 113: Migrar datos existentes a las nuevas columnas
-- Popula las nuevas columnas con datos de embarques existentes

-- ====================================
-- MIGRAR DATOS EXISTENTES
-- ====================================

-- Actualizar registros existentes con datos del tipo de servicio
UPDATE embarques_financiero ef
SET 
    tipo_servicio_precio = COALESCE(ts.precio_base, ts.pago_operador, 0),
    tipo_servicio_nombre = ts.nombre,
    precio_operador_final = CASE 
        WHEN ef.flete_falso = true THEN 
            -- Si es flete falso, usar pago_operador específico o precio fijo de 2500
            COALESCE(ef.pago_operador, 2500.00)
        ELSE 
            -- Si es normal, usar precio del tipo servicio o pago_operador específico
            COALESCE(ef.pago_operador, ts.precio_base, ts.pago_operador, 0)
    END
FROM embarques_nuevo e
LEFT JOIN tipos_servicio ts ON e.tipo_servicio_id = ts.id
WHERE ef.embarque_id = e.id
  AND (ef.tipo_servicio_precio IS NULL OR ef.tipo_servicio_nombre IS NULL OR ef.precio_operador_final IS NULL);

-- ====================================
-- VERIFICAR MIGRACIÓN
-- ====================================

-- Contar registros migrados
DO $$
DECLARE
    total_registros INTEGER;
    registros_con_datos INTEGER;
    registros_flete_falso INTEGER;
BEGIN
    -- Total de registros en embarques_financiero
    SELECT COUNT(*) INTO total_registros FROM embarques_financiero;
    
    -- Registros con las nuevas columnas pobladas
    SELECT COUNT(*) INTO registros_con_datos 
    FROM embarques_financiero 
    WHERE tipo_servicio_precio IS NOT NULL 
      AND tipo_servicio_nombre IS NOT NULL 
      AND precio_operador_final IS NOT NULL;
    
    -- Registros con flete falso
    SELECT COUNT(*) INTO registros_flete_falso
    FROM embarques_financiero 
    WHERE flete_falso = true;
    
    RAISE NOTICE '📊 MIGRACIÓN COMPLETADA:';
    RAISE NOTICE '   Total registros: %', total_registros;
    RAISE NOTICE '   Registros migrados: %', registros_con_datos;
    RAISE NOTICE '   Registros con flete falso: %', registros_flete_falso;
    
    IF registros_con_datos = total_registros THEN
        RAISE NOTICE '✅ MIGRACIÓN 100%% EXITOSA';
    ELSE
        RAISE NOTICE '⚠️  Algunos registros no fueron migrados completamente';
    END IF;
END $$;