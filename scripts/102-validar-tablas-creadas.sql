-- =================================================================
-- SCRIPT DE VALIDACIÓN: VERIFICAR NUEVAS TABLAS NORMALIZADAS
-- Ejecutar DESPUÉS de haber ejecutado el PASO 1 del script de migración
-- =================================================================

-- 1. Verificar que todas las nuevas tablas existen
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'embarques_core',
            'embarques_logistica', 
            'embarques_servicios',
            'embarques_facturacion',
            'embarques_envios_cliente',
            'embarques_pagos',
            'embarques_observaciones',
            'embarques_representantes'
        ) THEN '✅ EXISTE'
        ELSE '❌ NO EXISTE'
    END as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name LIKE 'embarques_%'
ORDER BY table_name;

-- 2. Verificar estructura de cada tabla nueva
SELECT 
    t.table_name,
    COUNT(c.column_name) as total_columnas,
    STRING_AGG(c.column_name, ', ' ORDER BY c.ordinal_position) as columnas
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
    AND t.table_name IN (
        'embarques_core',
        'embarques_logistica', 
        'embarques_servicios',
        'embarques_facturacion',
        'embarques_envios_cliente',
        'embarques_pagos',
        'embarques_observaciones',
        'embarques_representantes'
    )
GROUP BY t.table_name
ORDER BY t.table_name;

-- 3. Verificar índices creados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND tablename LIKE 'embarques_%'
    AND tablename != 'embarques'
    AND tablename != 'embarques_backup_migracion'
ORDER BY tablename, indexname;

-- 4. Verificar restricciones de foreign key
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name LIKE 'embarques_%'
    AND tc.table_name != 'embarques'
    AND tc.table_name != 'embarques_backup_migracion'
ORDER BY tc.table_name, tc.constraint_name;

-- 5. Verificar restricciones UNIQUE
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE' 
    AND tc.table_name LIKE 'embarques_%'
    AND tc.table_name != 'embarques'
    AND tc.table_name != 'embarques_backup_migracion'
ORDER BY tc.table_name, tc.constraint_name;

-- 6. Verificar que las tablas están vacías (antes de migración)
SELECT 
    'embarques_core' as tabla,
    COUNT(*) as registros
FROM embarques_core
UNION ALL
SELECT 
    'embarques_logistica' as tabla,
    COUNT(*) as registros
FROM embarques_logistica
UNION ALL
SELECT 
    'embarques_servicios' as tabla,
    COUNT(*) as registros
FROM embarques_servicios
UNION ALL
SELECT 
    'embarques_facturacion' as tabla,
    COUNT(*) as registros
FROM embarques_facturacion
UNION ALL
SELECT 
    'embarques_envios_cliente' as tabla,
    COUNT(*) as registros
FROM embarques_envios_cliente
UNION ALL
SELECT 
    'embarques_pagos' as tabla,
    COUNT(*) as registros
FROM embarques_pagos
UNION ALL
SELECT 
    'embarques_observaciones' as tabla,
    COUNT(*) as registros
FROM embarques_observaciones
UNION ALL
SELECT 
    'embarques_representantes' as tabla,
    COUNT(*) as registros
FROM embarques_representantes;

-- 7. Verificar que las funciones de migración existen
SELECT 
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name IN (
            'migrar_datos_embarques_normalizados',
            'validar_migracion_embarques'
        ) THEN '✅ EXISTE'
        ELSE '❌ NO EXISTE'  
    END as estado
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name LIKE '%embarques%'
ORDER BY routine_name;

-- 8. Resumen de validación
SELECT 
    '🎯 RESUMEN DE VALIDACIÓN' as titulo,
    '' as detalle
UNION ALL
SELECT 
    '📊 Tablas esperadas: 8' as titulo,
    'embarques_core, embarques_logistica, embarques_servicios, embarques_facturacion, embarques_envios_cliente, embarques_pagos, embarques_observaciones, embarques_representantes' as detalle
UNION ALL
SELECT 
    '🔧 Funciones esperadas: 2' as titulo,
    'migrar_datos_embarques_normalizados(), validar_migracion_embarques()' as detalle
UNION ALL
SELECT 
    '📝 Todas las tablas deben estar vacías' as titulo,
    'registros = 0 para todas las nuevas tablas' as detalle
UNION ALL
SELECT 
    '🚀 Si todo está OK, proceder con:' as titulo,
    'SELECT * FROM migrar_datos_embarques_normalizados();' as detalle;

-- ✅ Si todos los elementos muestran "EXISTE" y las tablas están vacías,
--    puedes proceder con la migración de datos