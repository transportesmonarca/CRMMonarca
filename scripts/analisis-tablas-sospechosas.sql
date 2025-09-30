-- =================================================================
-- ANÁLISIS RÁPIDO DE TABLAS SOSPECHOSAS
-- Basado en patrones comunes de tablas sin uso
-- =================================================================

-- 1. VERIFICAR TABLAS DE MIGRACIÓN Y BACKUP TEMPORALES
SELECT 
    '🔍 TABLAS DE MIGRACIÓN/BACKUP DETECTADAS' as categoria,
    table_name as tabla,
    CASE 
        WHEN table_name LIKE '%backup%' THEN 'Backup - Revisar si es necesario mantener'
        WHEN table_name LIKE '%_old%' THEN 'Tabla antigua - Candidata a eliminar'
        WHEN table_name LIKE '%legacy%' THEN 'Legado - Evaluar eliminación'
        WHEN table_name LIKE '%temp%' OR table_name LIKE '%staging%' THEN 'Temporal - Eliminar'
        WHEN table_name LIKE '%_migracion%' THEN 'Migración - Eliminar tras validar'
        WHEN table_name LIKE '%test%' THEN 'Pruebas - Eliminar'
        ELSE 'Revisar manualmente'
    END as recomendacion
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND (
        table_name LIKE '%backup%' OR 
        table_name LIKE '%_old%' OR 
        table_name LIKE '%legacy%' OR
        table_name LIKE '%temp%' OR 
        table_name LIKE '%staging%' OR
        table_name LIKE '%_migracion%' OR
        table_name LIKE '%test%'
    )
ORDER BY table_name;

-- 2. BUSCAR TABLAS DUPLICADAS O SIMILARES
WITH tablas_similares AS (
    SELECT 
        table_name,
        CASE 
            WHEN table_name LIKE 'embarques%' THEN 'embarques'
            WHEN table_name LIKE 'operador%' THEN 'operadores'
            WHEN table_name LIKE 'camion%' THEN 'camiones'
            WHEN table_name LIKE 'remolque%' THEN 'remolques'
            WHEN table_name LIKE 'cliente%' THEN 'clientes'
            WHEN table_name LIKE 'tipo%servicio%' THEN 'tipos_servicio'
            ELSE 'otros'
        END as familia
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
)
SELECT 
    '🔄 POSIBLES TABLAS DUPLICADAS' as categoria,
    familia,
    STRING_AGG(table_name, ', ') as tablas_en_familia,
    COUNT(*) as cantidad
FROM tablas_similares 
WHERE familia != 'otros'
GROUP BY familia
HAVING COUNT(*) > 3  -- Si hay más de 3 tablas similares, revisar
ORDER BY cantidad DESC;

-- 3. VERIFICAR TABLAS CON NOMBRES GENÉRICOS SOSPECHOSOS
SELECT 
    '⚠️ TABLAS CON NOMBRES SOSPECHOSOS' as categoria,
    table_name as tabla,
    CASE 
        WHEN table_name IN ('data', 'temp', 'tmp', 'test', 'prueba') THEN 'Nombre muy genérico'
        WHEN table_name LIKE '%_copy%' OR table_name LIKE '%copy' THEN 'Copia temporal'
        WHEN table_name LIKE '%bak%' OR table_name LIKE '%backup%' THEN 'Backup'
        WHEN LENGTH(table_name) < 4 THEN 'Nombre muy corto'
        ELSE 'Revisar'
    END as problema
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND (
        table_name IN ('data', 'temp', 'tmp', 'test', 'prueba') OR
        table_name LIKE '%_copy%' OR 
        table_name LIKE '%copy' OR
        table_name LIKE '%bak%' OR
        LENGTH(table_name) < 4
    )
ORDER BY table_name;

-- 4. BUSCAR TABLAS QUE PODRÍAN SER ÍNDICES O LOGS
SELECT 
    '📊 TABLAS DE SISTEMA/LOGS' as categoria,
    table_name as tabla,
    CASE 
        WHEN table_name LIKE '%_log%' OR table_name LIKE '%log%' THEN 'Tabla de logs'
        WHEN table_name LIKE '%audit%' OR table_name LIKE '%auditoria%' THEN 'Auditoría'
        WHEN table_name LIKE '%session%' OR table_name LIKE '%cache%' THEN 'Sesiones/Cache'
        WHEN table_name LIKE '%queue%' OR table_name LIKE '%job%' THEN 'Colas de trabajo'
        ELSE 'Sistema'
    END as tipo
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND (
        table_name LIKE '%_log%' OR 
        table_name LIKE '%log%' OR
        table_name LIKE '%audit%' OR 
        table_name LIKE '%auditoria%' OR
        table_name LIKE '%session%' OR 
        table_name LIKE '%cache%' OR
        table_name LIKE '%queue%' OR 
        table_name LIKE '%job%'
    )
ORDER BY table_name;

-- 5. RECOMENDACIONES GENERALES
SELECT 
    '📋 PLAN DE LIMPIEZA RECOMENDADO' as paso,
    '' as accion,
    '' as descripcion
UNION ALL
SELECT 
    '1. Ejecutar auditoría completa' as paso,
    'auditoria-tablas-bd.sql' as accion,
    'Ver todas las tablas y su uso real' as descripcion
UNION ALL
SELECT 
    '2. Identificar backups antiguos' as paso,
    'DROP TABLE si es necesario' as accion,
    'Eliminar backups de más de 30 días' as descripcion
UNION ALL
SELECT 
    '3. Limpiar tablas temporales' as paso,
    'DROP TABLE tablas_temp' as accion,
    'Eliminar staging, temp, test' as descripcion
UNION ALL
SELECT 
    '4. Consolidar tablas similares' as paso,
    'Migrar datos y eliminar duplicadas' as accion,
    'Una tabla por entidad principal' as descripcion
UNION ALL
SELECT 
    '5. Documentar tablas restantes' as paso,
    'Comentarios en BD' as accion,
    'Explicar propósito de cada tabla' as descripcion;

-- ✅ EJECUTA PRIMERO: auditoria-tablas-bd.sql para análisis completo
-- 📋 ESTE SCRIPT: Detecta patrones sospechosos comunes