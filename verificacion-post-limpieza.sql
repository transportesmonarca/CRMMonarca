
-- SCRIPT DE VERIFICACIÓN POST-LIMPIEZA
-- Ejecutar para confirmar que solo queda tabla embarques

SELECT 
    'VERIFICACIÓN FINAL' as resultado,
    table_name,
    CASE 
        WHEN table_name LIKE '%embarque%' THEN '✅ TABLA RELACIONADA'
        ELSE '⚪ OTRA TABLA'
    END as tipo
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%embarque%'
ORDER BY table_name;

-- Verificar que embarques tenga todas las columnas necesarias
SELECT 
    'COLUMNAS CRÍTICAS EN EMBARQUES' as verificacion,
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name IN ('fecha_completado', 'fecha_cancelacion', 'fecha_finalizacion') 
        THEN '✅ COLUMNA AGREGADA'
        ELSE '📋 COLUMNA EXISTENTE'
    END as estado
FROM information_schema.columns 
WHERE table_name = 'embarques'
AND column_name IN (
    'id', 'folio', 'estado', 'estado_facturacion', 
    'fecha_completado', 'fecha_creacion', 'updated_at',
    'cliente_id', 'operador_id', 'camion_id', 'remolque_id'
)
ORDER BY column_name;

-- Contar registros finales
SELECT 
    'REGISTROS FINALES' as info, 
    COUNT(*) as total,
    '📊 DATOS PRESERVADOS' as estado
FROM embarques;

-- Verificar índices críticos
SELECT 
    'ÍNDICES EMBARQUES' as verificacion,
    indexname,
    '✅ ÍNDICE ACTIVO' as estado
FROM pg_indexes 
WHERE tablename = 'embarques'
AND indexname LIKE 'idx_embarques%'
ORDER BY indexname;
