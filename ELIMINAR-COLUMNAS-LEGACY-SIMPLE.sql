-- Script SIMPLE para eliminar columnas legacy de facturación
-- Solo elimina columnas innecesarias (sin backup, sin migración de datos)
-- Para datos de prueba/desarrollo

-- 1. Agregar columna JSON (si no existe)
ALTER TABLE embarques 
ADD COLUMN IF NOT EXISTS facturas_json JSONB DEFAULT '[]'::jsonb;

-- 2. Crear índice para búsquedas en JSON
CREATE INDEX IF NOT EXISTS idx_embarques_facturas_json ON embarques USING GIN (facturas_json);

-- 3. Comentario para documentar
COMMENT ON COLUMN embarques.facturas_json IS 'Array JSON con folios de facturas: [{"numero": "FAC001", "fecha_envio": "2025-01-01", "fecha_pago": "2025-01-15", "referencia": "REF001"}]';

-- 4. Eliminar todas las columnas legacy innecesarias
DO $$
BEGIN
    -- Eliminar columnas de folios de facturas
    ALTER TABLE embarques DROP COLUMN IF EXISTS folio_factura_1;
    ALTER TABLE embarques DROP COLUMN IF EXISTS folio_factura_2;
    ALTER TABLE embarques DROP COLUMN IF EXISTS folio_factura_3;
    ALTER TABLE embarques DROP COLUMN IF EXISTS folio_factura_4;
    
    -- Eliminar columnas de números de facturas  
    ALTER TABLE embarques DROP COLUMN IF EXISTS numero_factura_1;
    ALTER TABLE embarques DROP COLUMN IF EXISTS numero_factura_2;
    ALTER TABLE embarques DROP COLUMN IF EXISTS numero_factura_3;
    ALTER TABLE embarques DROP COLUMN IF EXISTS numero_factura_4;
    
    -- Eliminar columnas de fechas de envío
    ALTER TABLE embarques DROP COLUMN IF EXISTS fecha_envio_cliente_1;
    ALTER TABLE embarques DROP COLUMN IF EXISTS fecha_envio_cliente_2;
    ALTER TABLE embarques DROP COLUMN IF EXISTS fecha_envio_cliente_3;
    ALTER TABLE embarques DROP COLUMN IF EXISTS fecha_envio_cliente_4;
    
    -- Eliminar columnas de fechas de pago
    ALTER TABLE embarques DROP COLUMN IF EXISTS fecha_pago_1;
    ALTER TABLE embarques DROP COLUMN IF EXISTS fecha_pago_2;
    ALTER TABLE embarques DROP COLUMN IF EXISTS fecha_pago_3;
    ALTER TABLE embarques DROP COLUMN IF EXISTS fecha_pago_4;
    
    -- Eliminar columnas de referencias de pago
    ALTER TABLE embarques DROP COLUMN IF EXISTS referencia_pago_1;
    ALTER TABLE embarques DROP COLUMN IF EXISTS referencia_pago_2;
    ALTER TABLE embarques DROP COLUMN IF EXISTS referencia_pago_3;
    ALTER TABLE embarques DROP COLUMN IF EXISTS referencia_pago_4;

    RAISE NOTICE 'Columnas legacy de facturación eliminadas exitosamente';
END;
$$;

-- 5. Verificar que las columnas fueron eliminadas
SELECT 
    'VERIFICACIÓN' as status,
    CASE 
        WHEN COUNT(*) = 0 THEN 'ÉXITO: Todas las columnas legacy fueron eliminadas'
        ELSE 'ADVERTENCIA: Aún quedan ' || COUNT(*) || ' columnas legacy'
    END as resultado
FROM information_schema.columns 
WHERE table_name = 'embarques' 
  AND (column_name LIKE 'folio_factura_%' 
       OR column_name LIKE 'numero_factura_%'
       OR column_name LIKE 'fecha_envio_cliente_%'
       OR column_name LIKE 'fecha_pago_%'
       OR column_name LIKE 'referencia_pago_%')
  AND column_name != 'facturas_json';

-- 6. Mostrar columnas restantes relacionadas con facturación
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'embarques' 
  AND (column_name LIKE '%factura%' OR column_name LIKE '%pago%' OR column_name = 'facturas_json')
ORDER BY column_name;