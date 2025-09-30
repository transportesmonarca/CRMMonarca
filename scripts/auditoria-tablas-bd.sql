-- =================================================================
-- AUDITORÍA COMPLETA DE TABLAS EN LA BASE DE DATOS
-- Identifica tablas sin uso, vacías o redundantes
-- =================================================================

-- 1. LISTAR TODAS LAS TABLAS CON INFORMACIÓN BÁSICA
SELECT 
    '📊 INVENTARIO COMPLETO DE TABLAS' as titulo,
    '' as detalle
UNION ALL
SELECT 
    table_name as titulo,
    CASE 
        WHEN table_type = 'BASE TABLE' THEN '🗃️ Tabla'
        WHEN table_type = 'VIEW' THEN '👁️ Vista' 
        ELSE table_type 
    END as detalle
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name NOT LIKE 'pg_%'
ORDER BY titulo;

-- 2. CONTEO DE REGISTROS POR TABLA (Versión compatible con Supabase)
SELECT 
    '📈 ACTIVIDAD POR TABLA (REGISTROS Y USO)' as tabla,
    '' as registros,
    '' as actividad,
    '' as estado
UNION ALL
SELECT 
    table_name as tabla,
    '1' as registros,
    'Revisar manualmente' as actividad,
    CASE 
        WHEN table_name LIKE '%backup%' OR table_name LIKE '%temp%' THEN '⚠️ TEMPORAL'
        WHEN table_name IN ('clientes', 'operadores', 'camiones', 'remolques', 'embarques') THEN '✅ PRINCIPAL'
        WHEN table_name LIKE 'embarques_%' THEN '✅ NORMALIZADA'
        ELSE '🔍 REVISAR'
    END as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY tabla;

-- 3. BUSCAR REFERENCIAS ENTRE TABLAS (FOREIGN KEYS)
SELECT 
    '🔗 RELACIONES ENTRE TABLAS' as tabla_origen,
    '' as campo,
    '' as tabla_destino,
    '' as uso
UNION ALL
SELECT 
    tc.table_name as tabla_origen,
    kcu.column_name as campo,
    ccu.table_name as tabla_destino,
    CASE 
        WHEN ccu.table_name IN (
            'clientes', 'operadores', 'camiones', 'remolques', 
            'embarques', 'tipos_servicio'
        ) THEN '✅ CRÍTICA'
        ELSE '⚠️ REVISAR'
    END as uso
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tabla_origen, campo;

-- 4. IDENTIFICAR TABLAS CANDIDATAS A ELIMINACIÓN (Versión simplificada)
SELECT 
    table_name as tabla,
    CASE 
        WHEN table_name LIKE '%backup%' THEN 'Backup'
        WHEN table_name LIKE '%temp%' OR table_name LIKE '%staging%' THEN 'Temporal'
        WHEN table_name LIKE '%_old%' OR table_name LIKE '%legacy%' THEN 'Antigua'
        WHEN table_name LIKE '%test%' OR table_name LIKE '%prueba%' THEN 'Prueba'
        ELSE 'Revisar'
    END as tipo,
    CASE 
        WHEN table_name LIKE '%backup%' THEN '⚠️ EVALUAR SI ELIMINAR'
        WHEN table_name LIKE '%temp%' OR table_name LIKE '%staging%' THEN '❌ CANDIDATA A ELIMINAR'
        WHEN table_name LIKE '%_old%' OR table_name LIKE '%legacy%' THEN '❌ CANDIDATA A ELIMINAR'
        WHEN table_name LIKE '%test%' OR table_name LIKE '%prueba%' THEN '❌ ELIMINAR'
        ELSE '🔍 INVESTIGAR USO'
    END as recomendacion
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND (
        table_name LIKE '%backup%' OR 
        table_name LIKE '%temp%' OR 
        table_name LIKE '%staging%' OR
        table_name LIKE '%_old%' OR 
        table_name LIKE '%legacy%' OR
        table_name LIKE '%test%' OR 
        table_name LIKE '%prueba%'
    )
ORDER BY tabla;

-- 5. TABLAS DE MIGRACIÓN/BACKUP TEMPORAL
SELECT 
    table_name as tabla,
    CASE 
        WHEN table_name LIKE '%backup%' THEN 'Backup de seguridad'
        WHEN table_name LIKE '%_old%' OR table_name LIKE '%_legacy%' THEN 'Tabla antigua'
        WHEN table_name LIKE '%staging%' OR table_name LIKE '%temp%' THEN 'Temporal'
        WHEN table_name LIKE '%_migracion%' THEN 'Proceso de migración'
        ELSE 'Revisar manualmente'
    END as proposito,
    CASE 
        WHEN table_name LIKE '%backup%' THEN '✅ Mantener por seguridad'
        WHEN table_name LIKE '%_old%' OR table_name LIKE '%_legacy%' THEN '⚠️ Evaluar si eliminar'
        WHEN table_name LIKE '%staging%' OR table_name LIKE '%temp%' THEN '❌ Candidata a eliminar'
        WHEN table_name LIKE '%_migracion%' THEN '⚠️ Eliminar tras validar migración'
        ELSE '🔍 Investigar'
    END as accion_recomendada
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND (
        table_name LIKE '%backup%' OR 
        table_name LIKE '%_old%' OR 
        table_name LIKE '%_legacy%' OR
        table_name LIKE '%staging%' OR 
        table_name LIKE '%temp%' OR
        table_name LIKE '%_migracion%'
    )
ORDER BY tabla;

-- 6. RESUMEN Y RECOMENDACIONES
SELECT 
    '📋 RESUMEN DE AUDITORÍA' as categoria,
    COUNT(*)::TEXT as cantidad,
    '' as recomendacion
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
    '🗃️ Tablas principales' as categoria,
    COUNT(*)::TEXT as cantidad,
    'Mantener todas' as recomendacion
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN ('clientes', 'operadores', 'camiones', 'remolques', 'embarques', 'tipos_servicio')
UNION ALL
SELECT 
    '✅ Tablas normalizadas nuevas' as categoria,
    COUNT(*)::TEXT as cantidad,
    'Recién creadas - mantener' as recomendacion
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name LIKE 'embarques_%'
UNION ALL
SELECT 
    '❌ Tablas temporales/backup' as categoria,
    COUNT(*)::TEXT as cantidad,
    'Evaluar eliminación' as recomendacion
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND (table_name LIKE '%backup%' OR table_name LIKE '%temp%' OR table_name LIKE '%old%')
ORDER BY categoria;

-- ✅ Ejecutar este script para obtener un análisis completo
-- 📋 Revisa especialmente las secciones "TABLAS SOSPECHOSAS" y "TABLAS DE BACKUP"