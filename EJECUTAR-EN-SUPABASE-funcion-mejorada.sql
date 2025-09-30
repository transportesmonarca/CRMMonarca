-- ====================================
-- FUNCIÓN MEJORADA: crear_embarque_normalizado
-- ====================================
-- Esta función reemplaza la anterior con mejor manejo de errores

DROP FUNCTION IF EXISTS crear_embarque_normalizado;

CREATE OR REPLACE FUNCTION crear_embarque_normalizado(
    p_folio VARCHAR(50),
    p_cliente_id UUID DEFAULT NULL,
    p_tipo_servicio_id UUID DEFAULT NULL,
    p_contenido TEXT DEFAULT NULL,
    p_origen VARCHAR(255) DEFAULT NULL,
    p_destino VARCHAR(255) DEFAULT NULL,
    p_peso DECIMAL(10,2) DEFAULT NULL,
    p_load_number VARCHAR(100) DEFAULT NULL,
    p_direccion_recolecta VARCHAR(255) DEFAULT NULL,
    p_direccion_entrega VARCHAR(255) DEFAULT NULL,
    p_fecha_recolecta DATE DEFAULT NULL,
    p_hora_recolecta TIME DEFAULT NULL,
    p_fecha_entrega DATE DEFAULT NULL,
    p_hora_entrega TIME DEFAULT NULL,
    p_camion_id UUID DEFAULT NULL,
    p_remolque_id UUID DEFAULT NULL,
    p_camion_numero_economico VARCHAR(50) DEFAULT NULL,
    p_camion_placa VARCHAR(20) DEFAULT NULL,
    p_remolque_numero_economico VARCHAR(50) DEFAULT NULL,
    p_remolque_placa VARCHAR(20) DEFAULT NULL,
    p_carta_porte VARCHAR(100) DEFAULT NULL,
    p_patente_agente_aduanal VARCHAR(100) DEFAULT NULL,
    p_aduana_cruce VARCHAR(100) DEFAULT NULL,
    p_dueno_mercancia VARCHAR(255) DEFAULT NULL,
    p_representante_cliente UUID DEFAULT NULL,
    p_info_representante JSONB DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    nuevo_embarque_id UUID;
    precio_flete DECIMAL(10,2) DEFAULT 0;
    precio_operador DECIMAL(10,2) DEFAULT 0;
    nombre_tipo_servicio VARCHAR(255) DEFAULT NULL;
BEGIN
    -- Validar parámetro obligatorio
    IF p_folio IS NULL OR TRIM(p_folio) = '' THEN
        RAISE EXCEPTION 'El folio es obligatorio';
    END IF;
    
    -- Verificar que el folio no existe
    IF EXISTS (SELECT 1 FROM embarques_nuevo WHERE folio = p_folio) THEN
        RAISE EXCEPTION 'Ya existe un embarque con el folio %', p_folio;
    END IF;
    
    -- Generar ID único
    nuevo_embarque_id := gen_random_uuid();
    
    RAISE NOTICE '🔧 Creando embarque % con ID %', p_folio, nuevo_embarque_id;
    
    -- Obtener precios del tipo de servicio si existe
    IF p_tipo_servicio_id IS NOT NULL THEN
        BEGIN
            SELECT 
                COALESCE(ts.precio_base, 0),
                COALESCE(ts.precio_base, 0),
                ts.nombre
            INTO precio_flete, precio_operador, nombre_tipo_servicio
            FROM tipos_servicio ts 
            WHERE ts.id = p_tipo_servicio_id;
            
            RAISE NOTICE '💰 Precios obtenidos del tipo servicio: flete=%, operador=%, nombre=%', 
                precio_flete, precio_operador, nombre_tipo_servicio;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️  Error obteniendo precios del tipo servicio: %', SQLERRM;
            precio_flete := 0;
            precio_operador := 0;
            nombre_tipo_servicio := 'Sin especificar';
        END;
    ELSE
        nombre_tipo_servicio := 'Sin especificar';
    END IF;
    
    -- 1. Insertar en tabla principal (embarques_nuevo)
    BEGIN
        INSERT INTO embarques_nuevo (
            id, folio, cliente_id, tipo_servicio_id, 
            camion_id, remolque_id, operador_id,
            contenido, peso, load_number, estado,
            created_at, updated_at
        ) VALUES (
            nuevo_embarque_id, p_folio, p_cliente_id, p_tipo_servicio_id, 
            p_camion_id, p_remolque_id, NULL,  -- operador_id por ahora NULL
            p_contenido, p_peso, p_load_number, 'creado',  -- CRÍTICO: estado inicial
            now(), now()
        );
        RAISE NOTICE '✅ 1/6 embarques_nuevo insertado';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error insertando en embarques_nuevo: %', SQLERRM;
    END;
    
    -- 2. Insertar ubicaciones (embarques_ubicaciones)
    BEGIN
        INSERT INTO embarques_ubicaciones (
            embarque_id, origen, destino, direccion_recolecta, direccion_entrega,
            fecha_recolecta, hora_recolecta, fecha_entrega, hora_entrega,
            aduana_cruce, patente_agente_aduanal,
            created_at, updated_at
        ) VALUES (
            nuevo_embarque_id, 
            COALESCE(p_origen, 'Por definir'), 
            COALESCE(p_destino, 'Por definir'),
            p_direccion_recolecta, p_direccion_entrega,
            p_fecha_recolecta, p_hora_recolecta, p_fecha_entrega, p_hora_entrega,
            p_aduana_cruce, p_patente_agente_aduanal,
            now(), now()
        );
        RAISE NOTICE '✅ 2/6 embarques_ubicaciones insertado';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error insertando en embarques_ubicaciones: %', SQLERRM;
    END;
    
    -- 3. Insertar financiero CON ARQUITECTURA DESACOPLADA
    BEGIN
        INSERT INTO embarques_financiero (
            embarque_id, precio_flete, 
            tipo_servicio_precio, precio_operador_final,
            tipo_servicio_nombre, flete_falso,
            created_at, updated_at
        ) VALUES (
            nuevo_embarque_id, precio_flete, 
            precio_operador, precio_operador,  -- ARQUITECTURA DESACOPLADA: Se copia el precio
            COALESCE(nombre_tipo_servicio, 'Sin especificar'), false,
            now(), now()
        );
        RAISE NOTICE '✅ 3/6 embarques_financiero insertado (arquitectura desacoplada)';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error insertando en embarques_financiero: %', SQLERRM;
    END;
    
    -- 4. Insertar estado (embarques_estado)
    BEGIN
        INSERT INTO embarques_estado (
            embarque_id, estado_facturacion, pagado, fecha_creacion,
            created_at, updated_at
        ) VALUES (
            nuevo_embarque_id, 'pendiente_facturacion', false, now(),
            now(), now()
        );
        RAISE NOTICE '✅ 4/6 embarques_estado insertado';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error insertando en embarques_estado: %', SQLERRM;
    END;
    
    -- 5. Insertar documentos (embarques_documentos)
    BEGIN
        INSERT INTO embarques_documentos (
            embarque_id, carta_porte,
            created_at, updated_at
        ) VALUES (
            nuevo_embarque_id, p_carta_porte,
            now(), now()
        );
        RAISE NOTICE '✅ 5/6 embarques_documentos insertado';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error insertando en embarques_documentos: %', SQLERRM;
    END;
    
    -- 6. Insertar adicional (embarques_adicional)
    BEGIN
        INSERT INTO embarques_adicional (
            embarque_id, dueno_mercancia, representante_cliente, 
            info_representante, observaciones,
            created_at, updated_at
        ) VALUES (
            nuevo_embarque_id, p_dueno_mercancia, 
            p_representante_cliente::VARCHAR(255), -- Cast para compatibilidad
            p_info_representante::TEXT, -- Cast para compatibilidad
            p_observaciones,
            now(), now()
        );
        RAISE NOTICE '✅ 6/6 embarques_adicional insertado';
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error insertando en embarques_adicional: %', SQLERRM;
    END;
    
    -- Log de éxito final
    RAISE NOTICE '🎉 Embarque % creado exitosamente en tablas normalizadas con ID %', p_folio, nuevo_embarque_id;
    RAISE NOTICE '📊 Arquitectura desacoplada aplicada: tipo_servicio_precio=%, precio_operador_final=%', 
        precio_operador, precio_operador;
    
    RETURN nuevo_embarque_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error general creando embarque %: %', p_folio, SQLERRM;
END;
$$ LANGUAGE plpgsql;