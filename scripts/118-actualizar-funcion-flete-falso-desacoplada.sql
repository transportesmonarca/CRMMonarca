-- Script 118: Actualizar función actualizar_flete_falso para arquitectura desacoplada
-- Cuando se marca flete falso, debe cambiar tipo_servicio_nombre a "Flete en Falso"

-- ====================================
-- FUNCIÓN ACTUALIZADA: actualizar_flete_falso
-- ====================================
CREATE OR REPLACE FUNCTION actualizar_flete_falso(
    p_embarque_id UUID,
    p_es_flete_falso BOOLEAN,
    p_precio_flete_falso DECIMAL(10,2) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    precio_final DECIMAL(10,2);
    servicio_precio DECIMAL(10,2);
    nombre_tipo_servicio VARCHAR(255);
BEGIN
    -- Si es flete falso, usar el precio proporcionado
    IF p_es_flete_falso = TRUE THEN
        precio_final := COALESCE(p_precio_flete_falso, 666.00);
        nombre_tipo_servicio := 'Flete en Falso';
    ELSE
        -- Si no es flete falso, recuperar los valores originales
        SELECT tipo_servicio_precio INTO servicio_precio
        FROM embarques_financiero
        WHERE embarque_id = p_embarque_id;
        
        precio_final := COALESCE(servicio_precio, 0);
        
        -- Recuperar el nombre original del tipo de servicio
        SELECT ts.nombre INTO nombre_tipo_servicio
        FROM embarques_nuevo e
        JOIN tipos_servicios ts ON ts.id = e.tipo_servicio_id
        WHERE e.id = p_embarque_id;
        
        -- Si no se encuentra, usar el que ya está guardado
        IF nombre_tipo_servicio IS NULL THEN
            SELECT tipo_servicio_nombre INTO nombre_tipo_servicio
            FROM embarques_financiero
            WHERE embarque_id = p_embarque_id;
        END IF;
    END IF;
    
    -- Actualizar la tabla financiera con ARQUITECTURA DESACOPLADA
    UPDATE embarques_financiero 
    SET 
        flete_falso = p_es_flete_falso,
        precio_operador_final = precio_final,
        tipo_servicio_nombre = COALESCE(nombre_tipo_servicio, 'Sin especificar'),
        updated_at = now()
    WHERE embarque_id = p_embarque_id;
    
    -- Log del cambio
    IF p_es_flete_falso = TRUE THEN
        RAISE NOTICE '✅ Flete falso ACTIVADO: Embarque %, Precio: $%, Nombre: "%"', 
                     p_embarque_id, precio_final, nombre_tipo_servicio;
    ELSE
        RAISE NOTICE '✅ Flete falso DESACTIVADO: Embarque %, Precio: $%, Nombre: "%"', 
                     p_embarque_id, precio_final, nombre_tipo_servicio;
    END IF;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- COMENTARIO ACTUALIZADO
-- ====================================
COMMENT ON FUNCTION actualizar_flete_falso IS 'ARQUITECTURA DESACOPLADA: Actualiza estado y precio de flete falso usando solo columnas independientes. Cambia tipo_servicio_nombre a "Flete en Falso" cuando se activa.';

-- ====================================
-- MENSAJE DE CONFIRMACIÓN
-- ====================================
DO $$
BEGIN
    RAISE NOTICE '🎯 FUNCIÓN actualizar_flete_falso ACTUALIZADA PARA ARQUITECTURA DESACOPLADA';
    RAISE NOTICE '✅ Ahora cambia tipo_servicio_nombre a "Flete en Falso" cuando se activa';
    RAISE NOTICE '✅ Restaura el nombre original cuando se desactiva';
    RAISE NOTICE '🔧 La interfaz ya no depende de la tabla tipos_servicios';
END $$;