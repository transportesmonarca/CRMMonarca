-- SCRIPT PARA IDENTIFICAR TODAS LAS TABLAS NORMALIZADAS QUE AÚN EXISTEN
-- Ejecutar ANTES del script de eliminación para ver qué hay que limpiar

-- =====================================================================
-- 1. LISTAR TODAS LAS TABLAS RELACIONADAS CON EMBARQUES
-- =====================================================================

SELECT 
    '🔍 INVENTARIO COMPLETO DE TABLAS' as seccion,
    table_schema,
    table_name,
    table_type,
    CASE 
        WHEN table_name = 'embarques' THEN '✅ LEGACY - MANTENER'
        WHEN table_name LIKE 'embarques_%' THEN '❌ NORMALIZADA - ELIMINAR'  
        WHEN table_name LIKE '%embarque%' THEN '⚠️  REVISAR - POSIBLE NORMALIZADA'
        ELSE '⚪ OTRA'
    END as accion_recomendada
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%embarque%' OR table_name LIKE '%embarques%')
ORDER BY 
    CASE 
        WHEN table_name = 'embarques' THEN 1
        ELSE 2 
    END,
    table_name;

-- =====================================================================
-- 2. LISTAR TODAS LAS VISTAS RELACIONADAS CON EMBARQUES  
-- =====================================================================

SELECT 
    '👁️  INVENTARIO DE VISTAS' as seccion,
    table_name as vista_name,
    '❌ VISTA NORMALIZADA - ELIMINAR' as accion
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name LIKE '%embarque%'
ORDER BY table_name;

-- =====================================================================
-- 3. LISTAR TODAS LAS FUNCIONES RELACIONADAS CON EMBARQUES
-- =====================================================================

SELECT 
    '⚙️  INVENTARIO DE FUNCIONES' as seccion,
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name LIKE '%normaliz%' THEN '❌ FUNCIÓN NORMALIZADA - ELIMINAR'
        WHEN routine_name LIKE 'crear_embarque_%' THEN '❌ FUNCIÓN NORMALIZADA - ELIMINAR'
        WHEN routine_name LIKE '%_embarque%' THEN '❌ FUNCIÓN NORMALIZADA - ELIMINAR'
        ELSE '⚠️  REVISAR FUNCIÓN'
    END as accion_recomendada
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%embarque%' OR routine_name LIKE '%normaliz%')
ORDER BY routine_name;

-- =====================================================================
-- 4. VERIFICAR DEPENDENCIAS Y RELACIONES
-- =====================================================================

-- Buscar foreign keys que apunten a tablas normalizadas
SELECT 
    '🔗 FOREIGN KEYS A REVISAR' as seccion,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    CASE 
        WHEN ccu.table_name LIKE 'embarques_%' THEN '❌ FK A TABLA NORMALIZADA - REVISAR'
        WHEN ccu.table_name = 'embarques' THEN '✅ FK A LEGACY - OK'
        ELSE '⚪ OTRA FK'
    END as estado
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND (tc.table_name LIKE '%embarque%' OR ccu.table_name LIKE '%embarque%')
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================================
-- 5. CONTAR REGISTROS EN CADA TABLA EXISTENTE
-- =====================================================================

-- Generar comandos dinámicos para contar registros
SELECT 
    '📊 COMANDOS PARA CONTAR REGISTROS' as seccion,
    table_name,
    'SELECT ''' || table_name || ''' as tabla, COUNT(*) as registros FROM ' || table_name || ';' as comando_sql
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%embarque%'
ORDER BY table_name;

-- =====================================================================
-- 6. GENERAR COMANDOS DE ELIMINACIÓN PERSONALIZADOS
-- =====================================================================

-- Generar comandos DROP para cada tabla normalizada encontrada
SELECT 
    '🗑️  COMANDOS DE ELIMINACIÓN GENERADOS' as seccion,
    table_name,
    'DROP TABLE IF EXISTS ' || table_name || ' CASCADE;' as comando_drop
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%embarque%'
AND table_name != 'embarques'  -- No eliminar la legacy
ORDER BY table_name;

-- Generar comandos DROP para vistas
SELECT 
    '🗑️  COMANDOS ELIMINACIÓN VISTAS' as seccion,
    table_name,
    'DROP VIEW IF EXISTS ' || table_name || ' CASCADE;' as comando_drop
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name LIKE '%embarque%'
ORDER BY table_name;

-- Generar comandos DROP para funciones (simplificado)
SELECT 
    '🗑️  COMANDOS ELIMINACIÓN FUNCIONES' as seccion,
    routine_name,
    'DROP FUNCTION IF EXISTS ' || routine_name || ' CASCADE;' as comando_drop
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%embarque%' OR routine_name LIKE '%normaliz%')
ORDER BY routine_name;

-- =====================================================================
-- 7. RESUMEN EJECUTIVO
-- =====================================================================

SELECT 
    '📋 RESUMEN EJECUTIVO' as seccion,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%embarque%') as total_tablas,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%embarque%' AND table_name != 'embarques') as tablas_a_eliminar,
    (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE '%embarque%') as vistas_a_eliminar,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND (routine_name LIKE '%embarque%' OR routine_name LIKE '%normaliz%')) as funciones_a_eliminar,
    '👆 EJECUTAR eliminar-tablas-normalizadas-completo.sql DESPUÉS' as siguiente_paso;