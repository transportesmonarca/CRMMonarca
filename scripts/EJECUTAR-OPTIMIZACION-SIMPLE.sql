-- ============================================================================
-- PASO 1: ANÁLISIS PREVIO (Solo lectura - seguro ejecutar)
-- ============================================================================

-- Ver estado actual de la tabla
SELECT 
    'Estado actual de locations' as titulo,
    COUNT(*) as total_registros,
    COUNT(DISTINCT operator_id) as operadores_unicos,
    pg_size_pretty(pg_total_relation_size('locations')) as tamano_tabla;

-- Ver duplicados por operador
SELECT 
    operator_id,
    COUNT(*) as total_ubicaciones,
    MIN(captured_at) as primera,
    MAX(captured_at) as ultima
FROM locations
WHERE operator_id IS NOT NULL
GROUP BY operator_id
HAVING COUNT(*) > 1
ORDER BY total_ubicaciones DESC
LIMIT 10;

-- ============================================================================
-- PASO 2: BACKUP DE SEGURIDAD (IMPORTANTE - ejecutar antes de hacer cambios)
-- ============================================================================

-- Crear tabla de respaldo con fecha
DROP TABLE IF EXISTS locations_backup_20251011;
CREATE TABLE locations_backup_20251011 AS 
SELECT * FROM locations;

-- Verificar que el backup se creó correctamente
SELECT 
    'Backup creado' as mensaje,
    COUNT(*) as registros_respaldados 
FROM locations_backup_20251011;

-- ============================================================================
-- PASO 3: LIMPIAR DUPLICADOS (CUIDADO - esto elimina datos)
-- ============================================================================

-- IMPORTANTE: Antes de ejecutar, revisa cuántos registros se eliminarán:
SELECT 
    'Registros que se eliminarán' as mensaje,
    COUNT(*) as total
FROM locations
WHERE id NOT IN (
    SELECT DISTINCT ON (operator_id) id
    FROM locations
    WHERE operator_id IS NOT NULL
    ORDER BY operator_id, captured_at DESC NULLS LAST
);

-- Si estás de acuerdo con el número anterior, ejecuta esto:
-- (Mantiene solo la ubicación más reciente por operador)

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
    'Después de limpieza' as mensaje,
    COUNT(*) as registros_restantes,
    COUNT(DISTINCT operator_id) as operadores_unicos
FROM locations;

-- ============================================================================
-- PASO 4: AGREGAR CONSTRAINT UNIQUE
-- ============================================================================

-- Eliminar constraint si existe
ALTER TABLE locations 
DROP CONSTRAINT IF EXISTS unique_operator_location;

-- Agregar constraint para prevenir duplicados futuros
ALTER TABLE locations 
ADD CONSTRAINT unique_operator_location 
UNIQUE (operator_id);

SELECT 'Constraint UNIQUE agregado correctamente' as mensaje;

-- ============================================================================
-- PASO 5: CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================================

-- Índice principal por operator_id
DROP INDEX IF EXISTS idx_locations_operator_id;
CREATE INDEX idx_locations_operator_id 
ON locations(operator_id) 
WHERE operator_id IS NOT NULL;

-- Índice por fecha de captura
DROP INDEX IF EXISTS idx_locations_captured_at;
CREATE INDEX idx_locations_captured_at 
ON locations(captured_at DESC);

-- Índice compuesto
DROP INDEX IF EXISTS idx_locations_operator_captured;
CREATE INDEX idx_locations_operator_captured 
ON locations(operator_id, captured_at DESC)
WHERE operator_id IS NOT NULL;

SELECT 'Índices creados correctamente' as mensaje;

-- ============================================================================
-- PASO 6: AGREGAR COLUMNAS ÚTILES
-- ============================================================================

ALTER TABLE locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE locations ADD COLUMN IF NOT EXISTS speed NUMERIC;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS accuracy NUMERIC;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS altitude NUMERIC;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS heading NUMERIC;

SELECT 'Columnas adicionales agregadas' as mensaje;

-- ============================================================================
-- PASO 7: VERIFICACIÓN FINAL
-- ============================================================================

SELECT 
    '✅ OPTIMIZACIÓN COMPLETADA' as resultado,
    COUNT(*) as registros_actuales,
    COUNT(DISTINCT operator_id) as operadores_con_ubicacion,
    pg_size_pretty(pg_total_relation_size('locations')) as tamano_tabla,
    pg_size_pretty(pg_indexes_size('locations')) as tamano_indices
FROM locations;

-- Ver las ubicaciones actuales
SELECT 
    l.operator_id,
    l.latitude,
    l.longitude,
    l.captured_at,
    EXTRACT(EPOCH FROM (NOW() - l.captured_at)) / 60 as minutos_atras
FROM locations l
ORDER BY l.captured_at DESC
LIMIT 10;
