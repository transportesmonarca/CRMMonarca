-- Script para migrar datos de facturación de columnas separadas a JSON
-- Similar al patrón usado para direcciones múltiples
-- Ejecutar en Supabase para consolidar datos de facturación

-- 1. Agregar nueva columna JSON para facturación
ALTER TABLE embarques 
ADD COLUMN IF NOT EXISTS facturas_json JSONB DEFAULT '[]'::jsonb;

-- 2. Comentarios para documentar el nuevo esquema
COMMENT ON COLUMN embarques.facturas_json IS 'Array JSON con folios de facturas: [{"numero": "FAC001", "fecha_envio": "2025-01-01", "fecha_pago": "2025-01-15", "referencia": "REF001"}]';

-- 3. Función para migrar datos existentes a formato JSON
CREATE OR REPLACE FUNCTION migrar_datos_facturacion_a_json()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    embarque_record RECORD;
    facturas_array JSONB := '[]'::jsonb;
    factura_obj JSONB;
    i INTEGER;
BEGIN
    -- Procesar cada embarque que tenga datos de facturación
    FOR embarque_record IN 
        SELECT id, 
               folio_factura_1, folio_factura_2, folio_factura_3, folio_factura_4,
               fecha_envio_cliente_1, fecha_envio_cliente_2, fecha_envio_cliente_3, fecha_envio_cliente_4,
               fecha_pago_1, fecha_pago_2, fecha_pago_3, fecha_pago_4,
               referencia_pago_1, referencia_pago_2, referencia_pago_3, referencia_pago_4
        FROM embarques 
        WHERE (folio_factura_1 IS NOT NULL AND folio_factura_1 != '') 
           OR (folio_factura_2 IS NOT NULL AND folio_factura_2 != '')
           OR (folio_factura_3 IS NOT NULL AND folio_factura_3 != '')
           OR (folio_factura_4 IS NOT NULL AND folio_factura_4 != '')
    LOOP
        -- Resetear array para cada embarque
        facturas_array := '[]'::jsonb;
        
        -- Procesar facturas 1-4
        FOR i IN 1..4 LOOP
            DECLARE
                folio_val TEXT;
                envio_val TEXT;
                pago_val TEXT;
                ref_val TEXT;
            BEGIN
                -- Obtener valores dinámicamente
                CASE i
                    WHEN 1 THEN 
                        folio_val := embarque_record.folio_factura_1;
                        envio_val := embarque_record.fecha_envio_cliente_1;
                        pago_val := embarque_record.fecha_pago_1;
                        ref_val := embarque_record.referencia_pago_1;
                    WHEN 2 THEN 
                        folio_val := embarque_record.folio_factura_2;
                        envio_val := embarque_record.fecha_envio_cliente_2;
                        pago_val := embarque_record.fecha_pago_2;
                        ref_val := embarque_record.referencia_pago_2;
                    WHEN 3 THEN 
                        folio_val := embarque_record.folio_factura_3;
                        envio_val := embarque_record.fecha_envio_cliente_3;
                        pago_val := embarque_record.fecha_pago_3;
                        ref_val := embarque_record.referencia_pago_3;
                    WHEN 4 THEN 
                        folio_val := embarque_record.folio_factura_4;
                        envio_val := embarque_record.fecha_envio_cliente_4;
                        pago_val := embarque_record.fecha_pago_4;
                        ref_val := embarque_record.referencia_pago_4;
                END CASE;
                
                -- Si hay un folio, crear objeto JSON
                IF folio_val IS NOT NULL AND folio_val != '' THEN
                    factura_obj := jsonb_build_object(
                        'numero', folio_val,
                        'fecha_envio', COALESCE(envio_val, null),
                        'fecha_pago', COALESCE(pago_val, null),
                        'referencia', COALESCE(ref_val, null)
                    );
                    
                    -- Agregar al array
                    facturas_array := facturas_array || factura_obj;
                END IF;
            END;
        END LOOP;
        
        -- Actualizar el embarque con el JSON consolidado
        UPDATE embarques 
        SET facturas_json = facturas_array,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = embarque_record.id;
        
        RAISE NOTICE 'Migrado embarque ID: %, facturas: %', embarque_record.id, jsonb_array_length(facturas_array);
    END LOOP;
    
    RAISE NOTICE 'Migración de datos de facturación completada';
END;
$$;

-- 4. Ejecutar la migración
SELECT migrar_datos_facturacion_a_json();

-- 5. Verificar migración exitosa antes de eliminar columnas
DO $$
DECLARE
    embarques_con_legacy INTEGER;
    embarques_con_json INTEGER;
BEGIN
    -- Contar embarques con datos legacy
    SELECT COUNT(*) INTO embarques_con_legacy
    FROM embarques 
    WHERE (folio_factura_1 IS NOT NULL AND folio_factura_1 != '')
       OR (folio_factura_2 IS NOT NULL AND folio_factura_2 != '')
       OR (folio_factura_3 IS NOT NULL AND folio_factura_3 != '')
       OR (folio_factura_4 IS NOT NULL AND folio_factura_4 != '');
    
    -- Contar embarques con datos JSON
    SELECT COUNT(*) INTO embarques_con_json
    FROM embarques 
    WHERE jsonb_array_length(facturas_json) > 0;
    
    RAISE NOTICE 'Embarques con datos legacy: %', embarques_con_legacy;
    RAISE NOTICE 'Embarques con datos JSON: %', embarques_con_json;
    
    -- Verificar que la migración fue exitosa
    IF embarques_con_legacy > 0 AND embarques_con_json = 0 THEN
        RAISE EXCEPTION 'Error: La migración no se completó correctamente. No se eliminarán las columnas legacy.';
    END IF;
    
    IF embarques_con_legacy > 0 AND embarques_con_json != embarques_con_legacy THEN
        RAISE NOTICE 'Advertencia: Hay % embarques legacy pero solo % con JSON. Verificar migración.', embarques_con_legacy, embarques_con_json;
    END IF;
    
    RAISE NOTICE 'Verificación completada. Procediendo a eliminar columnas legacy...';
END;
$$;

-- 6. Eliminar columnas legacy de facturación (ahora innecesarias)
DO $$
BEGIN
    ALTER TABLE embarques 
    DROP COLUMN IF EXISTS folio_factura_1,
    DROP COLUMN IF EXISTS folio_factura_2,
    DROP COLUMN IF EXISTS folio_factura_3,
    DROP COLUMN IF EXISTS folio_factura_4,
    DROP COLUMN IF EXISTS fecha_envio_cliente_1,
    DROP COLUMN IF EXISTS fecha_envio_cliente_2,
    DROP COLUMN IF EXISTS fecha_envio_cliente_3,
    DROP COLUMN IF EXISTS fecha_envio_cliente_4,
    DROP COLUMN IF EXISTS fecha_pago_1,
    DROP COLUMN IF EXISTS fecha_pago_2,
    DROP COLUMN IF EXISTS fecha_pago_3,
    DROP COLUMN IF EXISTS fecha_pago_4,
    DROP COLUMN IF EXISTS referencia_pago_1,
    DROP COLUMN IF EXISTS referencia_pago_2,
    DROP COLUMN IF EXISTS referencia_pago_3,
    DROP COLUMN IF EXISTS referencia_pago_4;

    RAISE NOTICE 'Columnas legacy eliminadas exitosamente';
END;
$$;

-- 7. Crear índices para el nuevo esquema JSON
CREATE INDEX IF NOT EXISTS idx_embarques_facturas_json ON embarques USING GIN (facturas_json);

-- 8. Función de utilidad para buscar por número de factura
CREATE OR REPLACE FUNCTION buscar_por_numero_factura(numero_factura TEXT)
RETURNS TABLE(
    embarque_id UUID,
    folio TEXT,
    cliente_nombre TEXT,
    facturas_data JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as embarque_id,
        e.folio,
        c.nombre as cliente_nombre,
        e.facturas_json as facturas_data
    FROM embarques e
    LEFT JOIN clientes c ON e.cliente_id = c.id
    WHERE e.facturas_json @> jsonb_build_array(jsonb_build_object('numero', numero_factura));
END;
$$;

-- 9. Vista de compatibilidad para código que espere campos individuales
CREATE OR REPLACE VIEW embarques_facturas_legacy AS
SELECT 
    e.*,
    -- Extraer facturas individuales del JSON para compatibilidad
    CASE 
        WHEN jsonb_array_length(e.facturas_json) > 0 THEN 
            e.facturas_json->0->>'numero'
        ELSE NULL 
    END as folio_factura_1,
    
    CASE 
        WHEN jsonb_array_length(e.facturas_json) > 1 THEN 
            e.facturas_json->1->>'numero'
        ELSE NULL 
    END as folio_factura_2,
    
    CASE 
        WHEN jsonb_array_length(e.facturas_json) > 2 THEN 
            e.facturas_json->2->>'numero'
        ELSE NULL 
    END as folio_factura_3,
    
    CASE 
        WHEN jsonb_array_length(e.facturas_json) > 3 THEN 
            e.facturas_json->3->>'numero'
        ELSE NULL 
    END as folio_factura_4,
    
    -- Fechas de envío
    CASE 
        WHEN jsonb_array_length(e.facturas_json) > 0 THEN 
            (e.facturas_json->0->>'fecha_envio')::DATE
        ELSE NULL 
    END as fecha_envio_cliente_1,
    
    CASE 
        WHEN jsonb_array_length(e.facturas_json) > 1 THEN 
            (e.facturas_json->1->>'fecha_envio')::DATE
        ELSE NULL 
    END as fecha_envio_cliente_2,
    
    -- Fechas de pago
    CASE 
        WHEN jsonb_array_length(e.facturas_json) > 0 THEN 
            (e.facturas_json->0->>'fecha_pago')::DATE
        ELSE NULL 
    END as fecha_pago_1,
    
    CASE 
        WHEN jsonb_array_length(e.facturas_json) > 1 THEN 
            (e.facturas_json->1->>'fecha_pago')::DATE
        ELSE NULL 
    END as fecha_pago_2,
    
    -- Referencias de pago
    CASE 
        WHEN jsonb_array_length(e.facturas_json) > 0 THEN 
            e.facturas_json->0->>'referencia'
        ELSE NULL 
    END as referencia_pago_1,
    
    CASE 
        WHEN jsonb_array_length(e.facturas_json) > 1 THEN 
            e.facturas_json->1->>'referencia'
        ELSE NULL 
    END as referencia_pago_2
    
FROM embarques e;

-- 10. Verificación final de la migración
SELECT 
    'Embarques con facturas JSON' as descripcion,
    COUNT(*) as cantidad
FROM embarques 
WHERE jsonb_array_length(facturas_json) > 0;

-- 11. Ejemplo de consulta con el nuevo esquema
SELECT 
    e.folio,
    c.nombre as cliente,
    e.facturas_json,
    jsonb_array_length(e.facturas_json) as num_facturas
FROM embarques e
LEFT JOIN clientes c ON e.cliente_id = c.id
WHERE jsonb_array_length(e.facturas_json) > 0
LIMIT 5;