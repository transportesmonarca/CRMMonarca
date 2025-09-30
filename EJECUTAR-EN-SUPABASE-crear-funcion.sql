-- ====================================
-- FUNCIÓN COMPLETA: crear_embarque_normalizado
-- ====================================
-- Esta función debe ejecutarse en Supabase SQL Editor

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
    -- Generar ID único
    nuevo_embarque_id := gen_random_uuid();
    
    -- Obtener precios del tipo de servicio si existe
    IF p_tipo_servicio_id IS NOT NULL THEN
        SELECT 
            COALESCE(ts.precio_base, 0),
            COALESCE(ts.precio_base, 0),
            ts.nombre
        INTO precio_flete, precio_operador, nombre_tipo_servicio
        FROM tipos_servicio ts 
        WHERE ts.id = p_tipo_servicio_id;
    END IF;
    
    -- 1. Insertar en tabla principal (embarques_nuevo)
    INSERT INTO embarques_nuevo (
        id, folio, cliente_id, tipo_servicio_id, contenido, peso, 
        load_number, estado, created_at, updated_at
    ) VALUES (
        nuevo_embarque_id, p_folio, p_cliente_id, p_tipo_servicio_id, 
        p_contenido, p_peso, p_load_number, 'creado', now(), now()
    );
    
    -- 2. Insertar ubicaciones (embarques_ubicaciones)
    INSERT INTO embarques_ubicaciones (
        embarque_id, origen, destino, direccion_recolecta, direccion_entrega,
        created_at, updated_at
    ) VALUES (
        nuevo_embarque_id, 
        COALESCE(p_origen, 'Por definir'), 
        COALESCE(p_destino, 'Por definir'),
        p_direccion_recolecta, p_direccion_entrega,
        now(), now()
    );
    
    -- 3. Insertar financiero CON ARQUITECTURA DESACOPLADA
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
    
    -- 4. Insertar estado (embarques_estado)
    INSERT INTO embarques_estado (
        embarque_id, estado, fecha_creacion,
        fecha_recolecta, hora_recolecta, fecha_entrega, hora_entrega,
        created_at, updated_at
    ) VALUES (
        nuevo_embarque_id, 'creado', now(),
        p_fecha_recolecta, p_hora_recolecta, p_fecha_entrega, p_hora_entrega,
        now(), now()
    );
    
    -- 5. Insertar documentos (embarques_documentos)
    INSERT INTO embarques_documentos (
        embarque_id, carta_porte, patente_agente_aduanal, 
        aduana_cruce, dueno_mercancia,
        created_at, updated_at
    ) VALUES (
        nuevo_embarque_id, p_carta_porte, p_patente_agente_aduanal,
        p_aduana_cruce, p_dueno_mercancia,
        now(), now()
    );
    
    -- 6. Insertar adicional (embarques_adicional)
    INSERT INTO embarques_adicional (
        embarque_id, camion_id, remolque_id,
        camion_numero_economico, camion_placa,
        remolque_numero_economico, remolque_placa,
        representante_cliente, info_representante, observaciones,
        created_at, updated_at
    ) VALUES (
        nuevo_embarque_id, p_camion_id, p_remolque_id,
        p_camion_numero_economico, p_camion_placa,
        p_remolque_numero_economico, p_remolque_placa,
        p_representante_cliente, p_info_representante, p_observaciones,
        now(), now()
    );
    
    -- Log de éxito
    RAISE NOTICE '✅ Embarque % creado en tablas normalizadas con ID %', p_folio, nuevo_embarque_id;
    
    RETURN nuevo_embarque_id;
END;
$$ LANGUAGE plpgsql;