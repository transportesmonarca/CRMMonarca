-- =================================================================
-- AUDITORÍA SIMPLE DE TABLAS - VERSION QUE FUNCIONA EN SUPABASE
-- =================================================================

-- 1. LISTAR TODAS LAS TABLAS
SELECT 
    table_name,
    table_type,
    CASE 
        WHEN table_name IN ('clientes', 'operadores', 'camiones', 'remolques', 'embarques', 'tipos_servicio') THEN '✅ PRINCIPAL'
        WHEN table_name LIKE 'embarques_%' THEN '✅ NORMALIZADA'
        WHEN table_name LIKE '%backup%' THEN '⚠️ BACKUP'
        WHEN table_name LIKE '%temp%' OR table_name LIKE '%staging%' THEN '❌ TEMPORAL'
        WHEN table_name LIKE '%_old%' OR table_name LIKE '%legacy%' THEN '❌ ANTIGUA'
        WHEN table_name LIKE '%test%' OR table_name LIKE '%prueba%' THEN '❌ PRUEBA'
        ELSE '🔍 REVISAR'
    END as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name NOT LIKE 'pg_%'
ORDER BY 
    CASE 
        WHEN table_name IN ('clientes', 'operadores', 'camiones', 'remolques', 'embarques', 'tipos_servicio') THEN 1
        WHEN table_name LIKE 'embarques_%' THEN 2
        ELSE 3
    END,
    table_name;

-- 2. CONTEO POR CATEGORÍA
SELECT 
    'RESUMEN POR CATEGORÍA' as categoria,
    '' as cantidad;

SELECT 
    'Tablas principales' as categoria,
    COUNT(*)::TEXT as cantidad
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN ('clientes', 'operadores', 'camiones', 'remolques', 'embarques', 'tipos_servicio')
UNION ALL
SELECT 
    'Tablas normalizadas (embarques_*)' as categoria,
    COUNT(*)::TEXT as cantidad
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name LIKE 'embarques_%'
UNION ALL
SELECT 
    'Tablas de backup' as categoria,
    COUNT(*)::TEXT as cantidad
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name LIKE '%backup%'
UNION ALL
SELECT 
    'Tablas temporales/staging' as categoria,
    COUNT(*)::TEXT as cantidad
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND (table_name LIKE '%temp%' OR table_name LIKE '%staging%')
UNION ALL
SELECT 
    'Tablas antiguas/legacy' as categoria,
    COUNT(*)::TEXT as cantidad
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND (table_name LIKE '%_old%' OR table_name LIKE '%legacy%')
UNION ALL
SELECT 
    'TOTAL de tablas' as categoria,
    COUNT(*)::TEXT as cantidad
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';

-- 3. RELACIONES CRÍTICAS (FOREIGN KEYS)
SELECT 
    'FOREIGN KEYS IMPORTANTES' as info,
    '' as detalle,
    '' as tabla;

SELECT 
    tc.table_name as tabla_origen,
    kcu.column_name as campo,
    ccu.table_name as tabla_referenciada
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;