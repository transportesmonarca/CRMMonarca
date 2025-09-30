-- ====================================
-- FUNCIÓN COMPLETA: crear_embarque_normalizado
-- ====================================
-- Función para crear un embarque completo en las tablas normalizadas
-- Esta función reemplaza la inserción directa en la tabla legacy 'embarques'

CREATE OR REPLACE FUNCTION crear_embarque_normalizado(
    -- Campos principales
    p_folio VARCHAR(50),
    p_cliente_id UUID DEFAULT NULL,
    p_tipo_servicio_id UUID DEFAULT NULL,
    p_contenido TEXT DEFAULT NULL,
    p_peso DECIMAL(10,2) DEFAULT NULL,
    p_load_number VARCHAR(100) DEFAULT NULL,
    
    -- Ubicaciones
    p_origen VARCHAR(255) DEFAULT NULL,
    p_destino VARCHAR(255) DEFAULT NULL,
    p_direccion_recolecta VARCHAR(255) DEFAULT NULL,
    p_direccion_entrega VARCHAR(255) DEFAULT NULL,
    
    -- Fechas y horas
    p_fecha_recolecta DATE DEFAULT NULL,
    p_hora_recolecta TIME DEFAULT NULL,
    p_fecha_entrega DATE DEFAULT NULL,
    p_hora_entrega TIME DEFAULT NULL,
    
    -- Vehículos
    p_camion_id UUID DEFAULT NULL,
    p_remolque_id UUID DEFAULT NULL,
    p_camion_numero_economico VARCHAR(50) DEFAULT NULL,
    p_camion_placa VARCHAR(20) DEFAULT NULL,
    p_remolque_numero_economico VARCHAR(50) DEFAULT NULL,
    p_remolque_placa VARCHAR(20) DEFAULT NULL,
    
    -- Documentos y legales
    p_carta_porte VARCHAR(100) DEFAULT NULL,
    p_patente_agente_aduanal VARCHAR(100) DEFAULT NULL,
    p_aduana_cruce VARCHAR(100) DEFAULT NULL,
    p_dueno_mercancia VARCHAR(255) DEFAULT NULL,
    
    -- Cliente y representante
    p_representante_cliente UUID DEFAULT NULL,
    p_info_representante JSONB DEFAULT NULL,
    
    -- Observaciones y notas
    p_observaciones TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    nuevo_embarque_id UUID;
    precio_tipo_servicio DECIMAL(10,2) DEFAULT 0;
    precio_operador DECIMAL(10,2) DEFAULT 0;
BEGIN
    -- Generar ID único para el embarque
    nuevo_embarque_id := gen_random_uuid();
    
    -- Obtener precios del tipo de servicio si existe
    IF p_tipo_servicio_id IS NOT NULL THEN
        SELECT 
            COALESCE(precio_flete, 0),
            COALESCE(precio_operador, 0)
        INTO precio_tipo_servicio, precio_operador
        FROM tipos_servicios 
        WHERE id = p_tipo_servicio_id;
    END IF;
    
    -- 1. INSERTAR EN TABLA PRINCIPAL (embarques_nuevo)
    INSERT INTO embarques_nuevo (
        id, folio, cliente_id, tipo_servicio_id, contenido, peso, 
        load_number, estado, created_at, updated_at
    ) VALUES (
        nuevo_embarque_id, 
        p_folio, 
        p_cliente_id, 
        p_tipo_servicio_id, 
        p_contenido, 
        p_peso,
        p_load_number,
        'creado',  -- CRÍTICO: estado inicial
        now(),
        now()
    );
    
    -- 2. INSERTAR UBICACIONES (embarques_ubicaciones)
    INSERT INTO embarques_ubicaciones (
        embarque_id, origen, destino, direccion_recolecta, direccion_entrega
    ) VALUES (
        nuevo_embarque_id, 
        COALESCE(p_origen, 'Por definir'), 
        COALESCE(p_destino, 'Por definir'),
        p_direccion_recolecta,
        p_direccion_entrega
    );
    
    -- 3. INSERTAR INFORMACIÓN FINANCIERA (embarques_financiero) - CON ARQUITECTURA DESACOPLADA
    INSERT INTO embarques_financiero (
        embarque_id, 
        precio_flete,
        tipo_servicio_precio,     -- COLUMNA DESACOPLADA: copia del precio original
        precio_operador_final,    -- COLUMNA DESACOPLADA: precio final que usa la interfaz
        flete_falso,
        created_at,
        updated_at
    ) VALUES (
        nuevo_embarque_id, 
        precio_tipo_servicio,
        precio_operador,          -- Se copia el precio base
        precio_operador,          -- Inicialmente igual, puede cambiar con flete falso
        false,                    -- Inicialmente no es flete falso
        now(),
        now()
    );
    
    -- 4. INSERTAR ESTADO INICIAL (embarques_estado)
    INSERT INTO embarques_estado (
        embarque_id, 
        estado,
        fecha_creacion,
        fecha_recolecta,
        hora_recolecta,
        fecha_entrega,
        hora_entrega,
        created_at,
        updated_at
    ) VALUES (
        nuevo_embarque_id, 
        'creado',  -- Estado inicial
        now(),
        p_fecha_recolecta,
        p_hora_recolecta,
        p_fecha_entrega,
        p_hora_entrega,
        now(),
        now()
    );
    
    -- 5. INSERTAR DOCUMENTOS (embarques_documentos)
    INSERT INTO embarques_documentos (
        embarque_id,
        carta_porte,
        patente_agente_aduanal,
        aduana_cruce,
        dueno_mercancia,
        created_at,
        updated_at
    ) VALUES (
        nuevo_embarque_id,
        p_carta_porte,
        p_patente_agente_aduanal,
        p_aduana_cruce,
        p_dueno_mercancia,
        now(),
        now()
    );
    
    -- 6. INSERTAR INFORMACIÓN ADICIONAL (embarques_adicional)
    INSERT INTO embarques_adicional (
        embarque_id,
        camion_id,
        remolque_id,
        camion_numero_economico,
        camion_placa,
        remolque_numero_economico,
        remolque_placa,
        representante_cliente,
        info_representante,
        observaciones,
        created_at,
        updated_at
    ) VALUES (
        nuevo_embarque_id,
        p_camion_id,
        p_remolque_id,
        p_camion_numero_economico,
        p_camion_placa,
        p_remolque_numero_economico,
        p_remolque_placa,
        p_representante_cliente,
        p_info_representante,
        p_observaciones,
        now(),
        now()
    );
    
    -- Log de creación
    RAISE NOTICE '✅ Embarque creado en tablas normalizadas: % (ID: %)', p_folio, nuevo_embarque_id;
    
    RETURN nuevo_embarque_id;
END;
$$ LANGUAGE plpgsql;