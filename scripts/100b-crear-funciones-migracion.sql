-- =================================================================
-- PASO 2: CREAR FUNCIONES DE MIGRACIÓN Y VALIDACIÓN
-- Ejecutar DESPUÉS de haber creado las tablas normalizadas
-- =================================================================

BEGIN;

-- Función para migrar datos de la tabla embarques a las nuevas tablas
CREATE OR REPLACE FUNCTION migrar_datos_embarques_normalizados()
RETURNS TABLE(
    total_migrados INTEGER,
    total_logistica INTEGER,
    total_servicios INTEGER,
    total_facturacion INTEGER,
    total_envios INTEGER,
    total_pagos INTEGER,
    total_observaciones INTEGER,
    total_representantes INTEGER
) AS $$
DECLARE
    contador_migrados INTEGER := 0;
    contador_logistica INTEGER := 0;
    contador_servicios INTEGER := 0;
    contador_facturacion INTEGER := 0;
    contador_envios INTEGER := 0;
    contador_pagos INTEGER := 0;
    contador_observaciones INTEGER := 0;
    contador_representantes INTEGER := 0;
    embarque_record RECORD;
BEGIN
    RAISE NOTICE 'Iniciando migración de datos...';
    
    -- Migrar cada embarque de la tabla original
    FOR embarque_record IN 
        SELECT * FROM embarques ORDER BY fecha_creacion
    LOOP
        -- 1. Insertar en embarques_core
        INSERT INTO embarques_core (
            id, folio, cliente_id, operador_id, camion_id, remolque_id,
            origen, destino, contenido, peso, estado, fecha_creacion, updated_at
        ) VALUES (
            embarque_record.id,
            embarque_record.folio,
            embarque_record.cliente_id,
            embarque_record.operador_id,
            embarque_record.camion_id,
            embarque_record.remolque_id,
            embarque_record.origen,
            embarque_record.destino,
            embarque_record.contenido,
            embarque_record.peso,
            embarque_record.estado,
            embarque_record.fecha_creacion,
            embarque_record.updated_at
        ) ON CONFLICT (id) DO NOTHING;
        
        contador_migrados := contador_migrados + 1;
        
        -- 2. Insertar en embarques_logistica (siempre insertar, aunque sea vacío)
        INSERT INTO embarques_logistica (
            embarque_id, lugar_recolecta, direccion_recolecta,
            fecha_recolecta, hora_recolecta, tiempo_recolecta,
            direccion_entrega, fecha_entrega, hora_entrega, tiempo_entrega,
            carta_porte, load_number, patente_agente_aduanal,
            aduana_cruce, dueno_mercancia, remolque_manual,
            remolque_numero_economico, remolque_placa
        ) VALUES (
            embarque_record.id,
            embarque_record.lugar_recolecta,
            embarque_record.direccion_recolecta,
            embarque_record.fecha_recolecta,
            embarque_record.hora_recolecta,
            embarque_record.tiempo_recolecta,
            embarque_record.direccion_entrega,
            embarque_record.fecha_entrega,
            embarque_record.hora_entrega,
            embarque_record.tiempo_entrega,
            embarque_record.carta_porte,
            embarque_record.load_number,
            embarque_record.patente_agente_aduanal,
            embarque_record.aduana_cruce,
            embarque_record.dueno_mercancia,
            COALESCE(embarque_record.remolque_manual, FALSE),
            embarque_record.remolque_numero_economico,
            embarque_record.remolque_placa
        ) ON CONFLICT (embarque_id) DO NOTHING;
        
        contador_logistica := contador_logistica + 1;
        
        -- 3. Insertar en embarques_servicios (siempre insertar)
        INSERT INTO embarques_servicios (
            embarque_id, tipo_servicio_id, precio_flete, moneda_flete,
            quickpaid_enabled, quickpaid_percent, quickpaid_descuento,
            precio_quickpaid, flete_falso, modificado, pago_operador
        ) VALUES (
            embarque_record.id,
            embarque_record.tipo_servicio_id,
            embarque_record.precio_flete,
            COALESCE(embarque_record.moneda_flete, 'MXN'),
            COALESCE(embarque_record.quickpaid_enabled, FALSE),
            embarque_record.quickpaid_percent,
            embarque_record.quickpaid_descuento,
            embarque_record.precio_quickpaid,
            COALESCE(embarque_record.flete_falso, FALSE),
            COALESCE(embarque_record.modificado, FALSE),
            embarque_record.pago_operador
        ) ON CONFLICT (embarque_id) DO NOTHING;
        
        contador_servicios := contador_servicios + 1;
        
        -- 4. Insertar en embarques_facturacion (siempre insertar)
        INSERT INTO embarques_facturacion (
            embarque_id, estado_facturacion, fecha_archivado,
            usuario_archivo, motivo_archivo, observaciones_archivo,
            fecha_cancelacion, cancelado_por, motivo_cancelacion, fecha_finalizacion
        ) VALUES (
            embarque_record.id,
            COALESCE(embarque_record.estado_facturacion, 'pendiente_facturacion'),
            embarque_record.fecha_archivado,
            embarque_record.usuario_archivo,
            embarque_record.motivo_archivo,
            embarque_record.observaciones_archivo,
            embarque_record.fecha_cancelacion,
            embarque_record.cancelado_por,
            embarque_record.motivo_cancelacion,
            embarque_record.fecha_finalizacion
        ) ON CONFLICT (embarque_id) DO NOTHING;
        
        contador_facturacion := contador_facturacion + 1;
        
        -- 5. Migrar envíos al cliente (convertir columnas en filas)
        -- fecha_envio_cliente (genérico)
        IF embarque_record.fecha_envio_cliente IS NOT NULL THEN
            INSERT INTO embarques_envios_cliente (embarque_id, numero_envio, fecha_envio, tipo_envio)
            VALUES (embarque_record.id, 0, embarque_record.fecha_envio_cliente::TIMESTAMP WITH TIME ZONE, 'general')
            ON CONFLICT (embarque_id, numero_envio) DO NOTHING;
            contador_envios := contador_envios + 1;
        END IF;
        
        -- fecha_envio_cliente_1 a 4
        IF embarque_record.fecha_envio_cliente_1 IS NOT NULL THEN
            INSERT INTO embarques_envios_cliente (embarque_id, numero_envio, fecha_envio, tipo_envio)
            VALUES (embarque_record.id, 1, embarque_record.fecha_envio_cliente_1::TIMESTAMP WITH TIME ZONE, 'factura')
            ON CONFLICT (embarque_id, numero_envio) DO NOTHING;
            contador_envios := contador_envios + 1;
        END IF;
        
        IF embarque_record.fecha_envio_cliente_2 IS NOT NULL THEN
            INSERT INTO embarques_envios_cliente (embarque_id, numero_envio, fecha_envio, tipo_envio)
            VALUES (embarque_record.id, 2, embarque_record.fecha_envio_cliente_2::TIMESTAMP WITH TIME ZONE, 'seguimiento')
            ON CONFLICT (embarque_id, numero_envio) DO NOTHING;
            contador_envios := contador_envios + 1;
        END IF;
        
        IF embarque_record.fecha_envio_cliente_3 IS NOT NULL THEN
            INSERT INTO embarques_envios_cliente (embarque_id, numero_envio, fecha_envio, tipo_envio)
            VALUES (embarque_record.id, 3, embarque_record.fecha_envio_cliente_3::TIMESTAMP WITH TIME ZONE, 'recordatorio')
            ON CONFLICT (embarque_id, numero_envio) DO NOTHING;
            contador_envios := contador_envios + 1;
        END IF;
        
        IF embarque_record.fecha_envio_cliente_4 IS NOT NULL THEN
            INSERT INTO embarques_envios_cliente (embarque_id, numero_envio, fecha_envio, tipo_envio)
            VALUES (embarque_record.id, 4, embarque_record.fecha_envio_cliente_4::TIMESTAMP WITH TIME ZONE, 'final')
            ON CONFLICT (embarque_id, numero_envio) DO NOTHING;
            contador_envios := contador_envios + 1;
        END IF;
        
        -- 6. Migrar pagos (convertir columnas en filas)
        -- referencia_pago genérico
        IF embarque_record.referencia_pago IS NOT NULL THEN
            INSERT INTO embarques_pagos (embarque_id, numero_pago, fecha_pago, referencia_pago)
            VALUES (embarque_record.id, 0, COALESCE(embarque_record.fecha_pago_1, CURRENT_DATE), embarque_record.referencia_pago)
            ON CONFLICT (embarque_id, numero_pago) DO NOTHING;
            contador_pagos := contador_pagos + 1;
        END IF;
        
        -- fecha_pago_1 con referencia_pago_1
        IF embarque_record.fecha_pago_1 IS NOT NULL THEN
            INSERT INTO embarques_pagos (embarque_id, numero_pago, fecha_pago, referencia_pago)
            VALUES (embarque_record.id, 1, embarque_record.fecha_pago_1::DATE, embarque_record.referencia_pago_1)
            ON CONFLICT (embarque_id, numero_pago) DO NOTHING;
            contador_pagos := contador_pagos + 1;
        END IF;
        
        IF embarque_record.fecha_pago_2 IS NOT NULL THEN
            INSERT INTO embarques_pagos (embarque_id, numero_pago, fecha_pago, referencia_pago)
            VALUES (embarque_record.id, 2, embarque_record.fecha_pago_2::DATE, embarque_record.referencia_pago_2)
            ON CONFLICT (embarque_id, numero_pago) DO NOTHING;
            contador_pagos := contador_pagos + 1;
        END IF;
        
        IF embarque_record.fecha_pago_3 IS NOT NULL THEN
            INSERT INTO embarques_pagos (embarque_id, numero_pago, fecha_pago, referencia_pago)
            VALUES (embarque_record.id, 3, embarque_record.fecha_pago_3::DATE, embarque_record.referencia_pago_3)
            ON CONFLICT (embarque_id, numero_pago) DO NOTHING;
            contador_pagos := contador_pagos + 1;
        END IF;
        
        IF embarque_record.fecha_pago_4 IS NOT NULL THEN
            INSERT INTO embarques_pagos (embarque_id, numero_pago, fecha_pago, referencia_pago)
            VALUES (embarque_record.id, 4, embarque_record.fecha_pago_4::DATE, embarque_record.referencia_pago_4)
            ON CONFLICT (embarque_id, numero_pago) DO NOTHING;
            contador_pagos := contador_pagos + 1;
        END IF;
        
        -- 7. Migrar observaciones generales
        IF embarque_record.observaciones IS NOT NULL AND TRIM(embarque_record.observaciones) != '' THEN
            INSERT INTO embarques_observaciones (embarque_id, tipo_observacion, observacion, usuario_creacion, fecha_creacion)
            VALUES (embarque_record.id, 'general', embarque_record.observaciones, 'sistema_migracion', embarque_record.fecha_creacion);
            contador_observaciones := contador_observaciones + 1;
        END IF;
        
        -- 8. Migrar representante
        IF embarque_record.representante_cliente IS NOT NULL OR embarque_record.info_representante IS NOT NULL THEN
            INSERT INTO embarques_representantes (embarque_id, representante_cliente_id, info_representante)
            VALUES (
                embarque_record.id, 
                CASE 
                    WHEN embarque_record.representante_cliente::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                    THEN embarque_record.representante_cliente::UUID 
                    ELSE NULL 
                END,
                embarque_record.info_representante
            ) ON CONFLICT (embarque_id) DO NOTHING;
            contador_representantes := contador_representantes + 1;
        END IF;
        
        -- Mostrar progreso cada 100 registros
        IF contador_migrados % 100 = 0 THEN
            RAISE NOTICE 'Migrados % embarques...', contador_migrados;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migración completada. Total embarques: %', contador_migrados;
    
    RETURN QUERY SELECT 
        contador_migrados,
        contador_logistica,
        contador_servicios,
        contador_facturacion,
        contador_envios,
        contador_pagos,
        contador_observaciones,
        contador_representantes;
END;
$$ LANGUAGE plpgsql;

-- Función para validar la integridad de la migración
CREATE OR REPLACE FUNCTION validar_migracion_embarques()
RETURNS TABLE(
    tabla VARCHAR,
    registros_original INTEGER,
    registros_migrados INTEGER,
    diferencia INTEGER,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH validacion AS (
        SELECT 
            'embarques_core'::VARCHAR as tabla,
            (SELECT COUNT(*) FROM embarques)::INTEGER as registros_original,
            (SELECT COUNT(*) FROM embarques_core)::INTEGER as registros_migrados
        UNION ALL
        SELECT 
            'embarques_logistica'::VARCHAR,
            (SELECT COUNT(*) FROM embarques)::INTEGER,
            (SELECT COUNT(*) FROM embarques_logistica)::INTEGER
        UNION ALL
        SELECT 
            'embarques_servicios'::VARCHAR,
            (SELECT COUNT(*) FROM embarques)::INTEGER,
            (SELECT COUNT(*) FROM embarques_servicios)::INTEGER
        UNION ALL
        SELECT 
            'embarques_facturacion'::VARCHAR,
            (SELECT COUNT(*) FROM embarques)::INTEGER,
            (SELECT COUNT(*) FROM embarques_facturacion)::INTEGER
    )
    SELECT 
        v.tabla,
        v.registros_original,
        v.registros_migrados,
        (v.registros_original - v.registros_migrados) as diferencia,
        CASE 
            WHEN v.registros_original = v.registros_migrados THEN '✅ OK'::VARCHAR
            WHEN v.registros_migrados = 0 THEN '❌ VACÍA'::VARCHAR
            ELSE '⚠️  DIFERENCIA'::VARCHAR
        END as status
    FROM validacion v;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Verificar que las funciones se crearon correctamente
SELECT 
    routine_name,
    routine_type,
    '✅ CREADA' as estado
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name LIKE '%embarques%'
ORDER BY routine_name;