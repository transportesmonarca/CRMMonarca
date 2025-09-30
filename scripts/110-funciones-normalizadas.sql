-- Script 110: Funciones SQL actualizadas para tablas normalizadas
-- Estas funciones reemplazan las referencias directas a la tabla embarques

-- ====================================
-- FUNCIÓN: obtener_embarque_completo
-- ====================================
-- Función que retorna un embarque completo con todos sus datos de las tablas relacionadas
CREATE OR REPLACE FUNCTION obtener_embarque_completo(p_embarque_id UUID)
RETURNS TABLE (
    -- Tabla principal
    id UUID,
    folio VARCHAR(50),
    cliente_id UUID,
    tipo_servicio_id UUID,
    operador_id UUID,
    camion_id UUID,
    remolque_id UUID,
    contenido TEXT,
    peso DECIMAL(10,2),
    load_number VARCHAR(100),
    estado VARCHAR(50),
    modificado BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    
    -- Ubicaciones
    origen VARCHAR(255),
    destino VARCHAR(255),
    fecha_recolecta DATE,
    fecha_entrega DATE,
    
    -- Financiero
    precio_flete DECIMAL(10,2),
    pago_operador DECIMAL(10,2),
    flete_falso BOOLEAN,
    
    -- Estado
    estado_facturacion VARCHAR(50),
    pagado BOOLEAN,
    
    -- Documentos
    carta_porte VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id, e.folio, e.cliente_id, e.tipo_servicio_id, 
        e.operador_id, e.camion_id, e.remolque_id,
        e.contenido, e.peso, e.load_number, e.estado, 
        e.modificado, e.created_at, e.updated_at,
        
        u.origen, u.destino, u.fecha_recolecta, u.fecha_entrega,
        
        f.precio_flete, f.pago_operador, f.flete_falso,
        
        es.estado_facturacion, es.pagado,
        
        d.carta_porte
        
    FROM embarques_nuevo e
    LEFT JOIN embarques_ubicaciones u ON e.id = u.embarque_id
    LEFT JOIN embarques_financiero f ON e.id = f.embarque_id
    LEFT JOIN embarques_estado es ON e.id = es.embarque_id
    LEFT JOIN embarques_documentos d ON e.id = d.embarque_id
    WHERE e.id = p_embarque_id;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- FUNCIÓN: actualizar_pago_operador
-- ====================================
-- Función para actualizar el pago de operador en la tabla financiera
CREATE OR REPLACE FUNCTION actualizar_pago_operador(
    p_embarque_id UUID,
    nuevo_pago DECIMAL(10,2)
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE embarques_financiero 
    SET pago_operador = nuevo_pago,
        updated_at = now()
    WHERE embarque_id = p_embarque_id;
    
    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- FUNCIÓN: actualizar_estado_embarque
-- ====================================
-- Función para actualizar el estado de un embarque
CREATE OR REPLACE FUNCTION actualizar_estado_embarque(
    p_embarque_id UUID,
    nuevo_estado VARCHAR(50),
    fecha_estado TIMESTAMP DEFAULT now()
) RETURNS BOOLEAN AS $$
BEGIN
    -- Actualizar estado en tabla principal
    UPDATE embarques_nuevo 
    SET estado = nuevo_estado,
        updated_at = now()
    WHERE id = p_embarque_id;
    
    -- Si es un estado de finalización, actualizar fecha
    IF nuevo_estado IN ('entregado', 'finalizado', 'completado') THEN
        UPDATE embarques_estado 
        SET fecha_finalizacion = fecha_estado,
            updated_at = now()
        WHERE embarque_id = p_embarque_id;
    END IF;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- FUNCIÓN: calcular_pago_operador_normalizado
-- ====================================
-- Función SQL que implementa la lógica de cálculo de pago con las nuevas tablas
CREATE OR REPLACE FUNCTION calcular_pago_operador_normalizado(p_embarque_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    pago_especifico DECIMAL(10,2);
    es_flete_falso BOOLEAN;
    precio_global_flete_falso DECIMAL(10,2);
    precio_tipo_servicio DECIMAL(10,2);
    resultado DECIMAL(10,2) := 0.00;
BEGIN
    -- 1. PRIORIDAD MÁXIMA: Pago específico del embarque
    SELECT f.pago_operador, f.flete_falso
    INTO pago_especifico, es_flete_falso
    FROM embarques_financiero f
    WHERE f.embarque_id = p_embarque_id;
    
    IF pago_especifico IS NOT NULL AND pago_especifico > 0 THEN
        resultado := pago_especifico;
        RAISE NOTICE 'Pago calculado (específico): %', resultado;
        RETURN resultado;
    END IF;
    
    -- 2. SEGUNDA PRIORIDAD: Si es flete falso, usar precio global
    IF es_flete_falso = TRUE THEN
        SELECT flete_falso_precio_global 
        INTO precio_global_flete_falso
        FROM configuracion_sistema 
        WHERE clave = 'flete_falso'
        LIMIT 1;
        
        IF precio_global_flete_falso IS NOT NULL THEN
            resultado := precio_global_flete_falso;
            RAISE NOTICE 'Pago calculado (flete falso global): %', resultado;
            RETURN resultado;
        END IF;
    END IF;
    
    -- 3. TERCERA PRIORIDAD: Precio del tipo de servicio
    SELECT COALESCE(ts.precio_base, ts.pago_operador, 0)
    INTO precio_tipo_servicio
    FROM embarques_nuevo e
    JOIN tipos_servicio ts ON e.tipo_servicio_id = ts.id
    WHERE e.id = p_embarque_id;
    
    IF precio_tipo_servicio IS NOT NULL AND precio_tipo_servicio > 0 THEN
        resultado := precio_tipo_servicio;
        RAISE NOTICE 'Pago calculado (tipo servicio): %', resultado;
        RETURN resultado;
    END IF;
    
    -- 4. FALLBACK
    RAISE NOTICE 'Pago calculado (fallback): 0.00';
    RETURN 0.00;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- FUNCIÓN: insertar_embarque_completo
-- ====================================
-- Función para insertar un embarque completo en todas las tablas normalizadas
CREATE OR REPLACE FUNCTION insertar_embarque_completo(
    p_folio VARCHAR(50),
    p_cliente_id UUID,
    p_tipo_servicio_id UUID,
    p_contenido TEXT,
    p_origen VARCHAR(255),
    p_destino VARCHAR(255),
    p_precio_flete DECIMAL(10,2)
) RETURNS UUID AS $$
DECLARE
    nuevo_embarque_id UUID;
BEGIN
    -- Generar ID para el embarque
    nuevo_embarque_id := gen_random_uuid();
    
    -- 1. Insertar en tabla principal
    INSERT INTO embarques_nuevo (
        id, folio, cliente_id, tipo_servicio_id, contenido
    ) VALUES (
        nuevo_embarque_id, p_folio, p_cliente_id, p_tipo_servicio_id, p_contenido
    );
    
    -- 2. Insertar ubicaciones
    INSERT INTO embarques_ubicaciones (
        embarque_id, origen, destino
    ) VALUES (
        nuevo_embarque_id, p_origen, p_destino
    );
    
    -- 3. Insertar información financiera
    INSERT INTO embarques_financiero (
        embarque_id, precio_flete
    ) VALUES (
        nuevo_embarque_id, p_precio_flete
    );
    
    -- 4. Insertar estado inicial
    INSERT INTO embarques_estado (
        embarque_id, fecha_creacion, estado, updated_at
    ) VALUES (
        nuevo_embarque_id, now(), 'creado', now()
    );
    
    -- 5. Insertar documentos (vacío inicialmente)
    INSERT INTO embarques_documentos (
        embarque_id
    ) VALUES (
        nuevo_embarque_id
    );
    
    -- 6. Insertar adicional (vacío inicialmente)
    INSERT INTO embarques_adicional (
        embarque_id
    ) VALUES (
        nuevo_embarque_id
    );
    
    RETURN nuevo_embarque_id;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- FUNCIÓN: obtener_embarques_operador
-- ====================================
-- Función optimizada para obtener embarques de un operador específico
CREATE OR REPLACE FUNCTION obtener_embarques_operador(p_operador_id UUID)
RETURNS TABLE (
    id UUID,
    folio VARCHAR(50),
    origen VARCHAR(255),
    destino VARCHAR(255),
    fecha_recolecta DATE,
    fecha_entrega DATE,
    pago_operador DECIMAL(10,2),
    flete_falso BOOLEAN,
    estado VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.folio,
        u.origen,
        u.destino,
        u.fecha_recolecta,
        u.fecha_entrega,
        f.pago_operador,
        f.flete_falso,
        e.estado
    FROM embarques_nuevo e
    LEFT JOIN embarques_ubicaciones u ON e.id = u.embarque_id
    LEFT JOIN embarques_financiero f ON e.id = f.embarque_id
    WHERE e.operador_id = p_operador_id
    ORDER BY e.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- ÍNDICES ADICIONALES PARA RENDIMIENTO
-- ====================================

-- Índices compuestos para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_embarques_nuevo_cliente_fecha ON embarques_nuevo(cliente_id, created_at);
CREATE INDEX IF NOT EXISTS idx_embarques_ubicaciones_fechas ON embarques_ubicaciones(fecha_recolecta, fecha_entrega);
CREATE INDEX IF NOT EXISTS idx_embarques_financiero_flete_falso ON embarques_financiero(flete_falso, pago_operador);
CREATE INDEX IF NOT EXISTS idx_embarques_estado_facturacion ON embarques_estado(estado_facturacion, pagado);

-- ====================================
-- PERMISOS Y COMENTARIOS
-- ====================================

COMMENT ON FUNCTION obtener_embarque_completo(UUID) IS 'Obtiene todos los datos de un embarque de las tablas normalizadas';
COMMENT ON FUNCTION actualizar_pago_operador(UUID, DECIMAL) IS 'Actualiza el pago del operador en la tabla financiera';
COMMENT ON FUNCTION actualizar_estado_embarque(UUID, VARCHAR, TIMESTAMP) IS 'Actualiza el estado de un embarque y fechas relacionadas';
COMMENT ON FUNCTION calcular_pago_operador_normalizado(UUID) IS 'Calcula el pago del operador usando las tablas normalizadas';
COMMENT ON FUNCTION insertar_embarque_completo IS 'Inserta un embarque completo en todas las tablas normalizadas';
COMMENT ON FUNCTION obtener_embarques_operador(UUID) IS 'Obtiene embarques de un operador específico con datos esenciales';

-- Mensaje de finalización
DO $$
BEGIN
    RAISE NOTICE '✅ FUNCIONES NORMALIZADAS CREADAS EXITOSAMENTE';
    RAISE NOTICE '🔧 6 funciones SQL para trabajar con tablas normalizadas';
    RAISE NOTICE '⚡ Sistema optimizado para mejor rendimiento';
END $$;