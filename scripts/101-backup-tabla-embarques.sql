-- =================================================================
-- BACKUP DE TABLA EMBARQUES ANTES DE MIGRACIÓN
-- Ejecutar ANTES de ejecutar la migración completa
-- =================================================================

-- 1. Crear tabla de backup con todos los datos actuales
DROP TABLE IF EXISTS embarques_backup_migracion;
CREATE TABLE embarques_backup_migracion AS 
SELECT * FROM embarques;

-- 2. Agregar comentario para documentar
COMMENT ON TABLE embarques_backup_migracion IS 
'Backup de la tabla embarques antes de migración de normalización - 23 septiembre 2025';

-- 3. Verificar que el backup se creó correctamente
SELECT 
    'embarques_original' as tabla,
    COUNT(*) as registros,
    pg_size_pretty(pg_total_relation_size('embarques')) as tamaño
FROM embarques
UNION ALL
SELECT 
    'embarques_backup' as tabla,
    COUNT(*) as registros,
    pg_size_pretty(pg_total_relation_size('embarques_backup_migracion')) as tamaño
FROM embarques_backup_migracion;

-- 4. Verificar algunas muestras de datos
SELECT 
    folio, 
    estado, 
    precio_flete, 
    flete_falso, 
    pago_operador,
    fecha_creacion
FROM embarques_backup_migracion 
ORDER BY fecha_creacion DESC 
LIMIT 5;

-- 5. Crear índice en el backup para consultas rápidas si es necesario
CREATE INDEX IF NOT EXISTS idx_backup_embarques_folio 
ON embarques_backup_migracion(folio);

-- 6. Verificar integridad de campos críticos
SELECT 
    COUNT(*) as total_embarques,
    COUNT(folio) as folios_no_nulos,
    COUNT(DISTINCT folio) as folios_unicos,
    COUNT(cliente_id) as con_cliente,
    COUNT(operador_id) as con_operador,
    COUNT(precio_flete) as con_precio_flete,
    COUNT(pago_operador) as con_pago_operador,
    COUNT(CASE WHEN flete_falso = true THEN 1 END) as flete_falso_count
FROM embarques_backup_migracion;

-- ✅ Si todos los números coinciden entre embarques y embarques_backup_migracion,
--    el backup está listo y puedes proceder con la migración