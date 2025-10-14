-- ============================================================================
-- SCRIPT DE OPTIMIZACIÓN INMEDIATA - TABLA LOCATIONS
-- ============================================================================
-- Fecha: 11 de Octubre, 2025
-- Objetivo: Prevenir saturación de la tabla locations
-- Acción: Limpiar duplicados y agregar constraints
-- ============================================================================

-- PASO 1: Analizar estado actual
-- ============================================================================
-- Ver cuántos registros hay por operador
SELECT 
    operator_id,
    COUNT(*) as total_ubicaciones,
    MIN(captured_at) as primera_ubicacion,
    MAX(captured_at) as ultima_ubicacion,
    MAX(captured_at) - MIN(captured_at) as tiempo_transcurrido
FROM locations
WHERE operator_id IS NOT NULL
GROUP BY operator_id
ORDER BY total_ubicaciones DESC;

-- Ver total de registros en la tabla
SELECT 
    COUNT(*) as total_registros,
    COUNT(DISTINCT operator_id) as operadores_unicos,
    COUNT(*) / NULLIF(COUNT(DISTINCT operator_id), 0) as promedio_por_operador,
    pg_size_pretty(pg_total_relation_size('locations')) as tamano_tabla
FROM locations;

-- ============================================================================
-- PASO 2: Backup de seguridad (IMPORTANTE)
-- ============================================================================
-- Crear tabla temporal con respaldo antes de hacer cambios
CREATE TABLE IF NOT EXISTS locations_backup_20251011 AS 
SELECT * FROM locations;

-- Verificar respaldo
SELECT COUNT(*) as registros_respaldados 
FROM locations_backup_20251011;

-- ============================================================================
-- PASO 3: Limpiar duplicados (mantener solo el más reciente por operador)
-- ============================================================================

-- Ver cuántos duplicados se eliminarán
SELECT COUNT(*) as registros_a_eliminar
FROM locations
WHERE id NOT IN (
    SELECT DISTINCT ON (operator_id) id
    FROM locations
    ORDER BY operator_id, captured_at DESC NULLS LAST
);

-- ELIMINAR DUPLICADOS (cuidado: esto es irreversible)
-- Mantiene solo la ubicación más reciente por cada operador
DELETE FROM locations
WHERE id NOT IN (
    SELECT DISTINCT ON (operator_id) id
    FROM locations
    WHERE operator_id IS NOT NULL
    ORDER BY operator_id, captured_at DESC NULLS LAST
);

-- Limpiar registros sin operator_id
DELETE FROM locations
WHERE operator_id IS NULL OR operator_id = '';

-- Verificar resultado
SELECT 
    COUNT(*) as registros_restantes,
    COUNT(DISTINCT operator_id) as operadores_unicos
FROM locations;

-- ============================================================================
-- PASO 4: Agregar constraint UNIQUE para prevenir duplicados futuros
-- ============================================================================

-- Eliminar constraint si ya existe
ALTER TABLE locations 
DROP CONSTRAINT IF EXISTS unique_operator_location;

-- Agregar constraint único por operator_id
ALTER TABLE locations 
ADD CONSTRAINT unique_operator_location 
UNIQUE (operator_id);

-- ============================================================================
-- PASO 5: Crear índices para optimización de consultas
-- ============================================================================

-- Índice principal por operator_id
DROP INDEX IF EXISTS idx_locations_operator_id;
CREATE INDEX idx_locations_operator_id 
ON locations(operator_id) 
WHERE operator_id IS NOT NULL;

-- Índice por fecha de captura (para consultas temporales)
DROP INDEX IF EXISTS idx_locations_captured_at;
CREATE INDEX idx_locations_captured_at 
ON locations(captured_at DESC);

-- Índice compuesto para consultas frecuentes
DROP INDEX IF EXISTS idx_locations_operator_captured;
CREATE INDEX idx_locations_operator_captured 
ON locations(operator_id, captured_at DESC)
WHERE operator_id IS NOT NULL;

-- Índice por operator_number (para búsquedas alternativas)
DROP INDEX IF EXISTS idx_locations_operator_number;
CREATE INDEX idx_locations_operator_number 
ON locations(operator_number)
WHERE operator_number IS NOT NULL;

-- ============================================================================
-- PASO 6: Agregar columnas útiles si no existen
-- ============================================================================

-- Columna para tracking de actualizaciones
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Columna para velocidad (útil para tracking)
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS speed NUMERIC;

-- Columna para precisión del GPS
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS accuracy NUMERIC;

-- Columna para altitud
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS altitude NUMERIC;

-- Columna para rumbo/dirección
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS heading NUMERIC;

-- ============================================================================
-- PASO 7: Crear función para actualizar updated_at automáticamente
-- ============================================================================

-- Función que actualiza el timestamp
CREATE OR REPLACE FUNCTION update_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que ejecuta la función antes de UPDATE
DROP TRIGGER IF EXISTS trigger_update_locations_timestamp ON locations;
CREATE TRIGGER trigger_update_locations_timestamp
BEFORE UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION update_locations_updated_at();

-- ============================================================================
-- PASO 8: Crear vista para ubicaciones recientes
-- ============================================================================

-- Vista con solo ubicaciones de las últimas 24 horas
CREATE OR REPLACE VIEW locations_recent AS
SELECT 
    l.*,
    o.nombre as operador_nombre,
    o.apellidos as operador_apellidos,
    o.operator_number,
    o.telefono as operador_telefono,
    EXTRACT(EPOCH FROM (NOW() - l.captured_at)) / 60 as minutos_desde_captura,
    CASE 
        WHEN (NOW() - l.captured_at) < INTERVAL '5 minutes' THEN 'ACTIVO'
        WHEN (NOW() - l.captured_at) < INTERVAL '30 minutes' THEN 'RECIENTE'
        WHEN (NOW() - l.captured_at) < INTERVAL '24 hours' THEN 'INACTIVO'
        ELSE 'MUY_ANTIGUO'
    END as estado_actividad
FROM locations l
LEFT JOIN operadores o ON o.id = l.operator_id::uuid
WHERE l.captured_at > NOW() - INTERVAL '24 hours'
ORDER BY l.captured_at DESC;

-- ============================================================================
-- PASO 9: Estadísticas finales
-- ============================================================================

-- Resumen de la optimización
SELECT 
    'OPTIMIZACIÓN COMPLETADA' as resultado,
    COUNT(*) as registros_actuales,
    COUNT(DISTINCT operator_id) as operadores_con_ubicacion,
    pg_size_pretty(pg_total_relation_size('locations')) as tamano_tabla,
    pg_size_pretty(pg_indexes_size('locations')) as tamano_indices
FROM locations;

-- Ver ubicaciones más recientes por operador
SELECT 
    l.operator_id,
    o.nombre || ' ' || COALESCE(o.apellidos, '') as operador,
    l.latitude,
    l.longitude,
    l.captured_at,
    EXTRACT(EPOCH FROM (NOW() - l.captured_at)) / 60 as minutos_atras
FROM locations l
LEFT JOIN operadores o ON o.id = l.operator_id::uuid
ORDER BY l.captured_at DESC
LIMIT 10;

-- ============================================================================
-- PASO 10: Consultas útiles para monitoreo
-- ============================================================================

-- Ver operadores con ubicación activa (últimos 5 minutos)
SELECT 
    o.operator_number,
    o.nombre || ' ' || COALESCE(o.apellidos, '') as operador,
    l.latitude,
    l.longitude,
    l.captured_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - l.captured_at)) / 60) as minutos_atras
FROM locations l
JOIN operadores o ON o.id = l.operator_id::uuid
WHERE l.captured_at > NOW() - INTERVAL '5 minutes'
ORDER BY l.captured_at DESC;

-- Ver tamaño de la tabla y crecimiento
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE tablename = 'locations';

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. SIEMPRE hacer backup antes de ejecutar este script
-- 2. Ejecutar en horario de bajo tráfico si es posible
-- 3. Monitorear el tamaño de la tabla regularmente
-- 4. Considerar implementar tabla de historial en el futuro
-- 5. Actualizar la app móvil para usar UPSERT en lugar de INSERT
-- ============================================================================

-- ¿Todo listo? Ejecuta esto para confirmar:
SELECT 
    'Script ejecutado exitosamente' as mensaje,
    NOW() as fecha_ejecucion,
    current_user as ejecutado_por,
    current_database() as base_de_datos;
