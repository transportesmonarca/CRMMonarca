-- ====================================
-- MIGRACIÓN DE EMBARQUES LEGACY A TABLAS NORMALIZADAS
-- ====================================
-- Migra TIM-2509-037 y TIM-2509-038 desde tabla 'embarques' a tablas normalizadas

DO $$
DECLARE
    embarque_record RECORD;
    nuevo_id UUID;
    precio_flete DECIMAL(10,2) DEFAULT 0;
    precio_operador DECIMAL(10,2) DEFAULT 0;
    nombre_tipo_servicio VARCHAR(255) DEFAULT 'Sin especificar';
    total_migrados INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 INICIANDO MIGRACIÓN DE EMBARQUES LEGACY...';
    
    -- Migrar cada embarque individualmente
    FOR embarque_record IN 
        SELECT * FROM embarques 
        WHERE folio IN ('TIM-2509-037', 'TIM-2509-038')
    LOOP
        -- Generar nuevo ID
        nuevo_id := gen_random_uuid();
        
        -- Obtener precios del tipo de servicio si existe
        precio_flete := 0;
        precio_operador := 0;
        nombre_tipo_servicio := 'Sin especificar';
        
        IF embarque_record.tipo_servicio_id IS NOT NULL THEN
            SELECT 
                COALESCE(ts.precio_base, 0),
                COALESCE(ts.precio_base, 0),
                ts.nombre
            INTO precio_flete, precio_operador, nombre_tipo_servicio
            FROM tipos_servicio ts 
            WHERE ts.id = embarque_record.tipo_servicio_id;
        END IF;
        
        RAISE NOTICE '📋 Migrando %: % → %', embarque_record.folio, embarque_record.id, nuevo_id;
        
        -- 1. INSERTAR EN embarques_nuevo
        INSERT INTO embarques_nuevo (
            id, folio, cliente_id, tipo_servicio_id, 
            camion_id, remolque_id, operador_id,
            contenido, peso, load_number, 
            created_at, updated_at
        ) VALUES (
            nuevo_id, 
            embarque_record.folio, 
            embarque_record.cliente_id, 
            embarque_record.tipo_servicio_id,
            embarque_record.camion_id,
            embarque_record.remolque_id,
            embarque_record.operador_id,
            embarque_record.contenido, 
            embarque_record.peso,
            embarque_record.load_number,
            COALESCE(embarque_record.fecha_creacion, now()),
            COALESCE(embarque_record.updated_at, now())
        );
        
        -- 2. INSERTAR EN embarques_ubicaciones
        INSERT INTO embarques_ubicaciones (
            embarque_id, origen, destino, direccion_recolecta, direccion_entrega,
            fecha_recolecta, hora_recolecta, fecha_entrega, hora_entrega,
            aduana_cruce, patente_agente_aduanal,
            created_at, updated_at
        ) VALUES (
            nuevo_id,
            COALESCE(embarque_record.origen, 'Por definir'),
            COALESCE(embarque_record.destino, 'Por definir'),
            embarque_record.direccion_recolecta,
            embarque_record.direccion_entrega,
            embarque_record.fecha_recolecta,
            embarque_record.hora_recolecta,
            embarque_record.fecha_entrega,
            embarque_record.hora_entrega,
            embarque_record.aduana_cruce,
            embarque_record.patente_agente_aduanal,
            COALESCE(embarque_record.fecha_creacion, now()),
            COALESCE(embarque_record.updated_at, now())
        );
        
        -- 3. INSERTAR EN embarques_financiero CON ARQUITECTURA DESACOPLADA
        INSERT INTO embarques_financiero (
            embarque_id, precio_flete, 
            tipo_servicio_precio, precio_operador_final,
            tipo_servicio_nombre, flete_falso,
            created_at, updated_at
        ) VALUES (
            nuevo_id, 
            precio_flete,
            precio_operador,           -- COLUMNA DESACOPLADA: precio base
            precio_operador,           -- COLUMNA DESACOPLADA: precio final (inicialmente igual)
            nombre_tipo_servicio,      -- COLUMNA DESACOPLADA: nombre del tipo de servicio
            false,                     -- Inicialmente no es flete falso
            COALESCE(embarque_record.fecha_creacion, now()),
            COALESCE(embarque_record.updated_at, now())
        );
        
        -- 4. INSERTAR EN embarques_estado
        INSERT INTO embarques_estado (
            embarque_id, estado_facturacion, pagado, fecha_creacion,
            created_at, updated_at
        ) VALUES (
            nuevo_id,
            COALESCE(embarque_record.estado_facturacion, 'pendiente_facturacion'),
            COALESCE(embarque_record.pagado, false),
            COALESCE(embarque_record.fecha_creacion, now()),
            COALESCE(embarque_record.fecha_creacion, now()),
            COALESCE(embarque_record.updated_at, now())
        );
        
        -- 5. INSERTAR EN embarques_documentos
        INSERT INTO embarques_documentos (
            embarque_id, carta_porte,
            created_at, updated_at
        ) VALUES (
            nuevo_id,
            embarque_record.carta_porte,
            COALESCE(embarque_record.fecha_creacion, now()),
            COALESCE(embarque_record.updated_at, now())
        );
        
        -- 6. INSERTAR EN embarques_adicional
        INSERT INTO embarques_adicional (
            embarque_id, dueno_mercancia, representante_cliente, 
            info_representante, observaciones,
            created_at, updated_at
        ) VALUES (
            nuevo_id,
            embarque_record.dueno_mercancia,
            embarque_record.representante_cliente,
            embarque_record.info_representante,
            embarque_record.observaciones,
            COALESCE(embarque_record.fecha_creacion, now()),
            COALESCE(embarque_record.updated_at, now())
        );
        
        total_migrados := total_migrados + 1;
        RAISE NOTICE '✅ Migrado: % completado', embarque_record.folio;
        
    END LOOP;
    
    RAISE NOTICE '📊 MIGRACIÓN COMPLETADA: % embarques migrados a tablas normalizadas', total_migrados;
    
    -- Verificar que se migraron correctamente
    IF total_migrados > 0 THEN
        RAISE NOTICE '🔍 VERIFICANDO MIGRACIÓN...';
        
        FOR embarque_record IN 
            SELECT folio FROM embarques_nuevo 
            WHERE folio IN ('TIM-2509-037', 'TIM-2509-038')
        LOOP
            RAISE NOTICE '✅ Verificado en tablas normalizadas: %', embarque_record.folio;
        END LOOP;
        
        RAISE NOTICE '⚠️  NOTA: Los embarques originales siguen en tabla legacy';
        RAISE NOTICE '💡 Para eliminarlos de la tabla legacy, ejecuta:';
        RAISE NOTICE '   DELETE FROM embarques WHERE folio IN (''TIM-2509-037'', ''TIM-2509-038'');';
    ELSE
        RAISE NOTICE '❌ No se encontraron embarques para migrar';
    END IF;
    
END $$;