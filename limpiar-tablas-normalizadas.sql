-- SCRIPT PARA ELIMINAR TABLAS NORMALIZADAS Y LIMPIAR SISTEMA
-- Este script elimina todas las tablas/vistas normalizadas y deja solo 'embarques' legacy

-- =====================================================================
-- 1. ELIMINAR VISTAS NORMALIZADAS
-- =====================================================================

DROP VIEW IF EXISTS embarques_completa_new CASCADE;
DROP VIEW IF EXISTS embarques_completa CASCADE;

-- =====================================================================
-- 2. ELIMINAR TABLAS NORMALIZADAS
-- =====================================================================

-- Eliminar tablas del sistema normalizado
DROP TABLE IF EXISTS embarques_nuevo CASCADE;
DROP TABLE IF EXISTS embarques_estado CASCADE; 
DROP TABLE IF EXISTS embarques_facturacion CASCADE;
DROP TABLE IF EXISTS embarques_logistica CASCADE;
DROP TABLE IF EXISTS embarques_temporal CASCADE;
DROP TABLE IF EXISTS embarques_metadata CASCADE;

-- Eliminar tabla consolidada (si existe)
DROP TABLE IF EXISTS embarques_consolidada CASCADE;

-- Eliminar tabla de importación (temporal)
DROP TABLE IF EXISTS embarques_import CASCADE;

-- =====================================================================
-- 3. ELIMINAR FUNCIONES NORMALIZADAS
-- =====================================================================

-- Funciones de transición de estado
DROP FUNCTION IF EXISTS completar_embarque(TEXT) CASCADE;
DROP FUNCTION IF EXISTS asignar_operador(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS iniciar_transito(TEXT) CASCADE;
DROP FUNCTION IF EXISTS finalizar_embarque(TEXT) CASCADE;
DROP FUNCTION IF EXISTS archivar_embarque(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS cancelar_embarque(TEXT, TEXT, TEXT) CASCADE;

-- Funciones de creación normalizada
DROP FUNCTION IF EXISTS crear_embarque_normalizado(JSONB) CASCADE;
DROP FUNCTION IF EXISTS crear_embarque_completo(JSONB) CASCADE;

-- Funciones auxiliares
DROP FUNCTION IF EXISTS obtener_estado_embarque(TEXT) CASCADE;
DROP FUNCTION IF EXISTS validar_transicion_estado(TEXT, TEXT) CASCADE;

-- =====================================================================
-- 4. VERIFICAR TABLA EMBARQUES LEGACY
-- =====================================================================

-- Verificar que la tabla embarques existe y está completa
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'embarques'
ORDER BY ordinal_position;

-- Verificar índices en tabla embarques
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'embarques'
ORDER BY indexname;

-- =====================================================================
-- 5. OPTIMIZAR TABLA EMBARQUES (si es necesario)
-- =====================================================================

-- Asegurar que todos los campos necesarios existen
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS fecha_completado TIMESTAMP WITH TIME ZONE;
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMP WITH TIME ZONE;
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS fecha_finalizacion TIMESTAMP WITH TIME ZONE;

-- Índices optimizados para la tabla única
CREATE INDEX IF NOT EXISTS idx_embarques_estado_fecha ON embarques(estado, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_embarques_facturacion_fecha ON embarques(estado_facturacion, fecha_archivado DESC);
CREATE INDEX IF NOT EXISTS idx_embarques_folio_unico ON embarques(folio) WHERE folio IS NOT NULL;

-- =====================================================================
-- 6. LIMPIAR PERMISOS Y POLÍTICAS RLS
-- =====================================================================

-- Eliminar políticas RLS de tablas eliminadas (si existían)
-- Las políticas se eliminan automáticamente con DROP TABLE CASCADE

-- =====================================================================
-- 7. VERIFICACIÓN FINAL
-- =====================================================================

-- Mostrar solo las tablas que deben quedar
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%embarque%'
ORDER BY table_name;

-- Contar registros en tabla embarques
SELECT 'embarques' as tabla, COUNT(*) as registros FROM embarques;

-- =====================================================================
-- RESUMEN
-- =====================================================================
SELECT 
    'Limpieza completada' as estado,
    'Solo queda tabla embarques legacy' as resultado,
    'UI debe actualizarse para usar solo embarques' as siguiente_paso;