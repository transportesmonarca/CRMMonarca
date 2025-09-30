-- Script 117: Sincronizar datos de flete falso inconsistentes
-- Corrige embarques donde flete_falso=true pero precio_operador_final=0

-- ====================================
-- 1. IDENTIFICAR EMBARQUES INCONSISTENTES
-- ====================================

DO $$
DECLARE 
    record_count INTEGER;
    precio_global DECIMAL(10,2);
BEGIN
    -- Obtener precio global de flete falso
    SELECT CAST(valor AS DECIMAL(10,2)) INTO precio_global
    FROM configuracion_sistema 
    WHERE nombre = 'flete_falso_precio_global'
    LIMIT 1;
    
    IF precio_global IS NULL THEN
        precio_global := 666.00; -- Precio fallback si no está configurado
        RAISE NOTICE '⚠️  Precio global no encontrado, usando fallback: $%', precio_global;
    ELSE
        RAISE NOTICE '💰 Precio global encontrado: $%', precio_global;
    END IF;

    -- Contar embarques inconsistentes
    SELECT COUNT(*) INTO record_count
    FROM embarques_financiero ef
    JOIN embarques_nuevo en ON en.id = ef.embarque_id
    WHERE ef.flete_falso = true 
        AND COALESCE(ef.precio_operador_final, 0) = 0;
    
    RAISE NOTICE '🔍 Embarques inconsistentes encontrados: %', record_count;
    
    IF record_count > 0 THEN
        -- ====================================
        -- 2. CORREGIR EMBARQUES INCONSISTENTES
        -- ====================================
        
        RAISE NOTICE '🔧 Corrigiendo embarques inconsistentes...';
        
        -- Actualizar precio_operador_final para embarques de flete falso sin precio
        UPDATE embarques_financiero 
        SET 
            precio_operador_final = precio_global,
            tipo_servicio_precio = COALESCE(tipo_servicio_precio, precio_global),
            tipo_servicio_nombre = COALESCE(tipo_servicio_nombre, 'Flete en Falso'),
            updated_at = now()
        WHERE flete_falso = true 
            AND COALESCE(precio_operador_final, 0) = 0;
        
        GET DIAGNOSTICS record_count = ROW_COUNT;
        RAISE NOTICE '✅ Embarques corregidos: %', record_count;
        
        -- ====================================
        -- 3. SINCRONIZAR CON TABLA embarques (COMPATIBILIDAD)
        -- ====================================
        
        RAISE NOTICE '🔄 Sincronizando con tabla embarques para compatibilidad...';
        
        -- Actualizar tabla embarques antigua para mantener compatibilidad
        UPDATE embarques 
        SET 
            pago_operador = precio_global,
            precio_flete = precio_global,
            moneda_flete = 'MXN'
        WHERE flete_falso = true 
            AND COALESCE(pago_operador, 0) IN (0, 666)
            AND id IN (
                SELECT ef.embarque_id 
                FROM embarques_financiero ef
                WHERE ef.flete_falso = true 
                    AND ef.precio_operador_final = precio_global
            );
        
        GET DIAGNOSTICS record_count = ROW_COUNT;
        RAISE NOTICE '🔄 Registros sincronizados en tabla embarques: %', record_count;
        
        -- ====================================
        -- 4. VERIFICAR CORRECCIÓN
        -- ====================================
        
        SELECT COUNT(*) INTO record_count
        FROM embarques_financiero ef
        WHERE ef.flete_falso = true 
            AND COALESCE(ef.precio_operador_final, 0) = 0;
        
        RAISE NOTICE '🔍 Embarques inconsistentes restantes: %', record_count;
        
        IF record_count = 0 THEN
            RAISE NOTICE '✅ TODOS LOS EMBARQUES DE FLETE FALSO CORREGIDOS';
        ELSE
            RAISE NOTICE '⚠️  Aún quedan % embarques por corregir', record_count;
        END IF;
        
    ELSE
        RAISE NOTICE '✅ NO SE ENCONTRARON INCONSISTENCIAS - DATOS YA ESTÁN CORRECTOS';
    END IF;
END $$;

-- ====================================
-- 5. MOSTRAR RESUMEN FINAL
-- ====================================

RAISE NOTICE '';
RAISE NOTICE '📋 RESUMEN FINAL:';

-- Mostrar embarques de flete falso actualizados
SELECT 
    en.folio,
    ef.precio_operador_final,
    ef.tipo_servicio_nombre,
    ef.flete_falso,
    ef.updated_at
FROM embarques_financiero ef
JOIN embarques_nuevo en ON en.id = ef.embarque_id
WHERE ef.flete_falso = true
ORDER BY ef.updated_at DESC
LIMIT 10;