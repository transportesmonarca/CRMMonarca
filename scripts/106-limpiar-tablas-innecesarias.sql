-- =================================================================
-- SCRIPT DE LIMPIEZA DE TABLAS INNECESARIAS
-- Eliminar tablas confirmadas como no necesarias
-- =================================================================

-- ⚠️  IMPORTANTE: Ejecutar solo después de confirmar que estas tablas no se usan

BEGIN;

-- 1. VERIFICAR QUE LAS TABLAS EXISTEN ANTES DE ELIMINAR
SELECT 
    '🔍 VERIFICANDO TABLAS A ELIMINAR' as accion,
    table_name,
    CASE 
        WHEN table_name IN ('folio_sequence', 'public_comments', 'representantes_clientes', 'tipos_servicio_import')
        THEN '✅ Existe - Se eliminará'
        ELSE '⚠️ No encontrada'
    END as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('folio_sequence', 'public_comments', 'representantes_clientes', 'tipos_servicio_import')
ORDER BY table_name;

-- 2. VERIFICAR SI HAY FOREIGN KEYS QUE DEPENDAN DE ESTAS TABLAS
SELECT 
    '🔗 VERIFICANDO DEPENDENCIAS (FOREIGN KEYS)' as info,
    tc.table_name as tabla_que_referencia,
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
    AND ccu.table_name IN ('folio_sequence', 'public_comments', 'representantes_clientes', 'tipos_servicio_import')
ORDER BY ccu.table_name;

-- 3. MOSTRAR RESUMEN ANTES DE ELIMINAR
SELECT 
    '📊 RESUMEN DE ELIMINACIÓN' as categoria,
    '' as tabla,
    '' as razon
UNION ALL
SELECT 
    'Tablas a eliminar:' as categoria,
    '4 tablas' as tabla,
    'Confirmadas como innecesarias' as razon
UNION ALL
SELECT 
    '1. folio_sequence' as categoria,
    'Sin folios, generación automática no usada' as tabla,
    '❌ ELIMINAR' as razon
UNION ALL
SELECT 
    '2. public_comments' as categoria,
    'Funcionalidad de comentarios no implementada' as tabla,
    '❌ ELIMINAR' as razon
UNION ALL
SELECT 
    '3. representantes_clientes' as categoria,
    'Sin información, redundante con contactos' as tabla,
    '❌ ELIMINAR' as razon
UNION ALL
SELECT 
    '4. tipos_servicio_import' as categoria,
    'Tabla temporal de importación completada' as tabla,
    '❌ ELIMINAR' as razon;

ROLLBACK; -- Solo verificación, no eliminamos aún

-- =================================================================
-- PARTE 2: SCRIPT DE ELIMINACIÓN REAL
-- Ejecutar SOLO si la verificación anterior está OK
-- =================================================================

-- DESCOMENTA LAS SIGUIENTES LÍNEAS PARA EJECUTAR LA ELIMINACIÓN:

/*
BEGIN;

-- Eliminar tablas en orden seguro (sin dependencias primero)
DROP TABLE IF EXISTS folio_sequence CASCADE;
DROP TABLE IF EXISTS public_comments CASCADE;  
DROP TABLE IF EXISTS representantes_clientes CASCADE;
DROP TABLE IF EXISTS tipos_servicio_import CASCADE;

-- Verificar que se eliminaron
SELECT 
    '✅ ELIMINACIÓN COMPLETADA' as resultado,
    COUNT(*) as tablas_restantes
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('folio_sequence', 'public_comments', 'representantes_clientes', 'tipos_servicio_import');

-- Si el resultado es 0, todas se eliminaron correctamente
COMMIT;
*/

-- =================================================================
-- INSTRUCCIONES:
-- 1. Ejecuta PRIMERO esta parte para verificar
-- 2. Si no hay dependencias problemáticas, descomenta la sección de eliminación
-- 3. Ejecuta la eliminación real
-- =================================================================