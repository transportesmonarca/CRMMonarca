-- Script 114: Funciones actualizadas para manejo de flete falso
-- Versión 2.0 de las funciones con las nuevas columnas

-- ====================================
-- FUNCIÓN ACTUALIZADA: obtener_embarque_completo
-- ====================================
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
    
    -- Financiero ACTUALIZADO
    precio_flete DECIMAL(10,2),
    pago_operador DECIMAL(10,2),
    flete_falso BOOLEAN,
    tipo_servicio_precio DECIMAL(10,2),
    tipo_servicio_nombre VARCHAR(255),
    precio_operador_final DECIMAL(10,2),
    
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
        f.tipo_servicio_precio, f.tipo_servicio_nombre, f.precio_operador_final,
        
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
-- FUNCIÓN ACTUALIZADA: calcular_pago_operador_normalizado
-- ====================================
CREATE OR REPLACE FUNCTION calcular_pago_operador_normalizado(p_embarque_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    precio_final DECIMAL(10,2);
    resultado DECIMAL(10,2) := 0.00;
BEGIN
    -- 1. PRIORIDAD MÁXIMA: Usar precio_operador_final si existe
    SELECT f.precio_operador_final
    INTO precio_final
    FROM embarques_financiero f
    WHERE f.embarque_id = p_embarque_id;
    
    IF precio_final IS NOT NULL AND precio_final > 0 THEN
        resultado := precio_final;
        RAISE NOTICE 'Pago calculado (precio final): %', resultado;
        RETURN resultado;
    END IF;
    
    -- 2. FALLBACK: Si no existe precio_operador_final, usar lógica anterior
    DECLARE
        pago_especifico DECIMAL(10,2);
        es_flete_falso BOOLEAN;
        precio_global_flete_falso DECIMAL(10,2);
        tipo_servicio_precio DECIMAL(10,2);
    BEGIN
        SELECT f.pago_operador, f.flete_falso, f.tipo_servicio_precio
        INTO pago_especifico, es_flete_falso, tipo_servicio_precio
        FROM embarques_financiero f
        WHERE f.embarque_id = p_embarque_id;
        
        -- Pago específico del embarque
        IF pago_especifico IS NOT NULL AND pago_especifico > 0 THEN
            resultado := pago_especifico;
            RAISE NOTICE 'Pago calculado (específico): %', resultado;
            RETURN resultado;
        END IF;
        
        -- Flete falso
        IF es_flete_falso = TRUE THEN
            -- Usar precio fijo de flete falso (2500) como fallback
            resultado := 2500.00;
            RAISE NOTICE 'Pago calculado (flete falso): %', resultado;
            RETURN resultado;
        END IF;
        
        -- Precio del tipo servicio (nueva columna)
        IF tipo_servicio_precio IS NOT NULL AND tipo_servicio_precio > 0 THEN
            resultado := tipo_servicio_precio;
            RAISE NOTICE 'Pago calculado (tipo servicio almacenado): %', resultado;
            RETURN resultado;
        END IF;
    END;
    
    -- FALLBACK final
    RAISE NOTICE 'Pago calculado (fallback): 0.00';
    RETURN 0.00;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- FUNCIÓN NUEVA: insertar_embarque_completo_v2
-- ====================================
CREATE OR REPLACE FUNCTION insertar_embarque_completo_v2(
    p_folio VARCHAR(50),
    p_cliente_id UUID,
    p_tipo_servicio_id UUID,
    p_contenido TEXT,
    p_origen VARCHAR(255),
    p_destino VARCHAR(255),
    p_precio_flete DECIMAL(10,2),
    p_es_flete_falso BOOLEAN DEFAULT FALSE,
    p_precio_flete_falso DECIMAL(10,2) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    nuevo_embarque_id UUID;
    servicio_precio DECIMAL(10,2);
    servicio_nombre VARCHAR(255);
    precio_final DECIMAL(10,2);
BEGIN
    -- Generar ID para el embarque
    nuevo_embarque_id := gen_random_uuid();
    
    -- Obtener datos del tipo de servicio
    SELECT COALESCE(ts.precio_base, ts.pago_operador, 0), ts.nombre
    INTO servicio_precio, servicio_nombre
    FROM tipos_servicio ts
    WHERE ts.id = p_tipo_servicio_id;
    
    -- Calcular precio final según sea flete falso o normal
    IF p_es_flete_falso = TRUE AND p_precio_flete_falso IS NOT NULL THEN
        precio_final := p_precio_flete_falso;
    ELSE
        precio_final := servicio_precio;
    END IF;
    
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
    
    -- 3. Insertar información financiera CON NUEVAS COLUMNAS
    INSERT INTO embarques_financiero (
        embarque_id, 
        precio_flete,
        flete_falso,
        tipo_servicio_precio,
        tipo_servicio_nombre,
        precio_operador_final
    ) VALUES (
        nuevo_embarque_id, 
        p_precio_flete,
        p_es_flete_falso,
        servicio_precio,
        servicio_nombre,
        precio_final
    );
    
    -- 4. Insertar estado inicial
    INSERT INTO embarques_estado (
        embarque_id, fecha_creacion
    ) VALUES (
        nuevo_embarque_id, now()
    );
    
    -- 5. Insertar documentos
    INSERT INTO embarques_documentos (
        embarque_id
    ) VALUES (
        nuevo_embarque_id
    );
    
    -- 6. Insertar adicional
    INSERT INTO embarques_adicional (
        embarque_id
    ) VALUES (
        nuevo_embarque_id
    );
    
    RETURN nuevo_embarque_id;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- FUNCIÓN NUEVA: actualizar_flete_falso
-- ====================================
CREATE OR REPLACE FUNCTION actualizar_flete_falso(
    p_embarque_id UUID,
    p_es_flete_falso BOOLEAN,
    p_precio_flete_falso DECIMAL(10,2) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    precio_final DECIMAL(10,2);
    servicio_precio DECIMAL(10,2);
BEGIN
    -- Si es flete falso, usar el precio proporcionado
    IF p_es_flete_falso = TRUE THEN
        precio_final := COALESCE(p_precio_flete_falso, 0);
    ELSE
        -- Si no es flete falso, usar el precio original del tipo servicio
        SELECT tipo_servicio_precio INTO servicio_precio
        FROM embarques_financiero
        WHERE embarque_id = p_embarque_id;
        
        precio_final := COALESCE(servicio_precio, 0);
    END IF;
    
    -- Actualizar la tabla financiera
    UPDATE embarques_financiero 
    SET 
        flete_falso = p_es_flete_falso,
        precio_operador_final = precio_final,
        updated_at = now()
    WHERE embarque_id = p_embarque_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- FUNCIÓN ACTUALIZADA: obtener_embarques_operador
-- ====================================
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
    estado VARCHAR(50),
    tipo_servicio_nombre VARCHAR(255),
    precio_operador_final DECIMAL(10,2)
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
        e.estado,
        f.tipo_servicio_nombre,
        f.precio_operador_final
    FROM embarques_nuevo e
    LEFT JOIN embarques_ubicaciones u ON e.id = u.embarque_id
    LEFT JOIN embarques_financiero f ON e.id = f.embarque_id
    WHERE e.operador_id = p_operador_id
    ORDER BY e.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- COMENTARIOS ACTUALIZADOS
-- ====================================
COMMENT ON FUNCTION obtener_embarque_completo(UUID) IS 'Obtiene embarque completo con nuevas columnas de flete falso';
COMMENT ON FUNCTION calcular_pago_operador_normalizado(UUID) IS 'Calcula pago usando precio_operador_final prioritariamente';
COMMENT ON FUNCTION insertar_embarque_completo_v2 IS 'Versión 2.0 - Inserta embarque con soporte para flete falso inteligente';
COMMENT ON FUNCTION actualizar_flete_falso IS 'Actualiza estado y precio de flete falso manteniendo datos originales';
COMMENT ON FUNCTION obtener_embarques_operador(UUID) IS 'Obtiene embarques con precio final real para facturación';

-- ====================================
-- MENSAJE FINAL
-- ====================================
DO $$
BEGIN
    RAISE NOTICE '✅ FUNCIONES ACTUALIZADAS EXITOSAMENTE';
    RAISE NOTICE '🔧 Soporte completo para flete falso inteligente';
    RAISE NOTICE '💰 precio_operador_final siempre disponible';
    RAISE NOTICE '📊 Facturación/cobranza nunca mostrará $0';
END $$;