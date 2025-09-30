-- Script de BACKUP antes de migrar a JSON
-- ¡EJECUTAR ANTES de EJECUTAR-EN-SUPABASE-json-facturacion.sql!
-- Este script crea una tabla de respaldo con los datos legacy

-- 1. Crear tabla de backup
CREATE TABLE IF NOT EXISTS backup_embarques_facturacion_legacy AS
SELECT 
    id,
    folio,
    fecha_creacion,
    folio_factura_1,
    folio_factura_2, 
    folio_factura_3,
    folio_factura_4,
    fecha_envio_cliente,
    fecha_envio_cliente_1,
    fecha_envio_cliente_2,
    fecha_envio_cliente_3,
    fecha_envio_cliente_4,
    fecha_pago,
    fecha_pago_1,
    fecha_pago_2,
    fecha_pago_3,
    fecha_pago_4,
    referencia_pago,
    referencia_pago_1,
    referencia_pago_2,
    referencia_pago_3,
    referencia_pago_4,
    observaciones_facturacion,
    created_at,
    updated_at
FROM embarques
WHERE 
    (folio_factura_1 IS NOT NULL AND folio_factura_1 != '')
    OR (folio_factura_2 IS NOT NULL AND folio_factura_2 != '')
    OR (folio_factura_3 IS NOT NULL AND folio_factura_3 != '')
    OR (folio_factura_4 IS NOT NULL AND folio_factura_4 != '')
    OR (fecha_envio_cliente_1 IS NOT NULL)
    OR (fecha_envio_cliente_2 IS NOT NULL)
    OR (fecha_envio_cliente_3 IS NOT NULL)
    OR (fecha_envio_cliente_4 IS NOT NULL)
    OR (fecha_pago_1 IS NOT NULL)
    OR (fecha_pago_2 IS NOT NULL)
    OR (fecha_pago_3 IS NOT NULL)
    OR (fecha_pago_4 IS NOT NULL)
    OR (referencia_pago_1 IS NOT NULL AND referencia_pago_1 != '')
    OR (referencia_pago_2 IS NOT NULL AND referencia_pago_2 != '')
    OR (referencia_pago_3 IS NOT NULL AND referencia_pago_3 != '')
    OR (referencia_pago_4 IS NOT NULL AND referencia_pago_4 != '');

-- 2. Agregar columna de timestamp del backup
ALTER TABLE backup_embarques_facturacion_legacy 
ADD COLUMN backup_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. Agregar comentarios
COMMENT ON TABLE backup_embarques_facturacion_legacy IS 'Backup de datos de facturación legacy antes de migrar a JSON - NO ELIMINAR';
COMMENT ON COLUMN backup_embarques_facturacion_legacy.backup_timestamp IS 'Momento en que se creó el backup';

-- 4. Crear índice para búsquedas rápidas en el backup
CREATE INDEX IF NOT EXISTS idx_backup_facturacion_folio ON backup_embarques_facturacion_legacy(folio);
CREATE INDEX IF NOT EXISTS idx_backup_facturacion_id ON backup_embarques_facturacion_legacy(id);

-- 5. Estadísticas del backup
SELECT 
    'BACKUP CREADO' as status,
    COUNT(*) as embarques_respaldados,
    MIN(fecha_creacion) as embarque_mas_antiguo,
    MAX(fecha_creacion) as embarque_mas_reciente,
    SUM(CASE WHEN folio_factura_1 IS NOT NULL THEN 1 ELSE 0 END) as con_factura_1,
    SUM(CASE WHEN folio_factura_2 IS NOT NULL THEN 1 ELSE 0 END) as con_factura_2,
    SUM(CASE WHEN folio_factura_3 IS NOT NULL THEN 1 ELSE 0 END) as con_factura_3,
    SUM(CASE WHEN folio_factura_4 IS NOT NULL THEN 1 ELSE 0 END) as con_factura_4
FROM backup_embarques_facturacion_legacy;

-- 6. Función para restaurar desde backup (en caso de emergencia)
CREATE OR REPLACE FUNCTION restaurar_desde_backup_facturacion()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    resultado TEXT;
    registros_restaurados INTEGER := 0;
BEGIN
    -- Verificar que existe la tabla de backup
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_embarques_facturacion_legacy') THEN
        RETURN 'ERROR: No existe la tabla de backup';
    END IF;
    
    -- Restaurar datos desde backup
    UPDATE embarques 
    SET 
        folio_factura_1 = backup.folio_factura_1,
        folio_factura_2 = backup.folio_factura_2,
        folio_factura_3 = backup.folio_factura_3,
        folio_factura_4 = backup.folio_factura_4,
        fecha_envio_cliente = backup.fecha_envio_cliente,
        fecha_envio_cliente_1 = backup.fecha_envio_cliente_1,
        fecha_envio_cliente_2 = backup.fecha_envio_cliente_2,
        fecha_envio_cliente_3 = backup.fecha_envio_cliente_3,
        fecha_envio_cliente_4 = backup.fecha_envio_cliente_4,
        fecha_pago = backup.fecha_pago,
        fecha_pago_1 = backup.fecha_pago_1,
        fecha_pago_2 = backup.fecha_pago_2,
        fecha_pago_3 = backup.fecha_pago_3,
        fecha_pago_4 = backup.fecha_pago_4,
        referencia_pago = backup.referencia_pago,
        referencia_pago_1 = backup.referencia_pago_1,
        referencia_pago_2 = backup.referencia_pago_2,
        referencia_pago_3 = backup.referencia_pago_3,
        referencia_pago_4 = backup.referencia_pago_4,
        updated_at = CURRENT_TIMESTAMP
    FROM backup_embarques_facturacion_legacy backup
    WHERE embarques.id = backup.id;
    
    GET DIAGNOSTICS registros_restaurados = ROW_COUNT;
    
    resultado := format('Restauración completada: %s registros actualizados', registros_restaurados);
    
    RAISE NOTICE '%', resultado;
    RETURN resultado;
END;
$$;

-- 7. Instrucciones de uso
SELECT 
    'BACKUP COMPLETADO' as mensaje,
    'Para restaurar en caso de emergencia, ejecutar: SELECT restaurar_desde_backup_facturacion();' as instrucciones_restauracion,
    'Ahora puede ejecutar EJECUTAR-EN-SUPABASE-json-facturacion.sql con seguridad' as siguiente_paso;