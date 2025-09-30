-- =================================================================
-- INVESTIGACIÓN DETALLADA DE TABLAS ESPECÍFICAS
-- Analizar propósito y necesidad de tablas cuestionables
-- =================================================================

-- 1. FOLIO_SEQUENCE - Investigar si es para generar números de folio
SELECT 
    'ANÁLISIS: folio_sequence' as tabla,
    '' as detalle,
    '' as columnas,
    '' as registros
UNION ALL
SELECT 
    'Propósito probable' as tabla,
    'Secuencia para generar números de folio automáticos' as detalle,
    '' as columnas,
    '' as registros;

-- Ver estructura de folio_sequence
SELECT 
    'folio_sequence - ESTRUCTURA' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'folio_sequence'
ORDER BY ordinal_position;

-- 2. PUBLIC_COMMENTS - ¿Sistema de comentarios públicos?
SELECT 
    'ANÁLISIS: public_comments' as tabla,
    '' as detalle,
    '' as columnas,
    '' as registros
UNION ALL
SELECT 
    'Propósito probable' as tabla,
    'Sistema de comentarios o notas públicas' as detalle,
    '' as columnas,
    '' as registros;

-- Ver estructura de public_comments
SELECT 
    'public_comments - ESTRUCTURA' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'public_comments'
ORDER BY ordinal_position;

-- 3. REPRESENTANTES_CLIENTES vs CONTACTOS_CLIENTES - ¿Redundancia?
SELECT 
    'ANÁLISIS: POSIBLE REDUNDANCIA' as tabla,
    '' as detalle,
    '' as problema
UNION ALL
SELECT 
    'representantes_clientes' as tabla,
    'Personas que representan al cliente' as detalle,
    '¿Es lo mismo que contactos?' as problema
UNION ALL
SELECT 
    'contactos_clientes' as tabla,
    'Contactos del cliente' as detalle,
    '¿Duplica funcionalidad?' as problema;

-- Comparar estructuras
SELECT 
    'representantes_clientes - CAMPOS' as origen,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'representantes_clientes'
ORDER BY ordinal_position;

SELECT 
    'contactos_clientes - CAMPOS' as origen,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'contactos_clientes'
ORDER BY ordinal_position;

-- 4. TIPOS_SERVICIO_IMPORT - ¿Tabla temporal de importación?
SELECT 
    'ANÁLISIS: tipos_servicio_import' as tabla,
    '' as detalle,
    '' as recomendacion
UNION ALL
SELECT 
    'Propósito probable' as tabla,
    'Importación temporal de tipos de servicio' as detalle,
    'Candidata a eliminar si ya se importó' as recomendacion;

-- Ver estructura
SELECT 
    'tipos_servicio_import - ESTRUCTURA' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'tipos_servicio_import'
ORDER BY ordinal_position;

-- 5. VISTA_EMBARQUE_COMPLETA - ¿Vista o tabla?
SELECT 
    'ANÁLISIS: vista_embarque_completa' as objeto,
    table_type as tipo,
    CASE 
        WHEN table_type = 'VIEW' THEN 'Es una vista - revisar si está actualizada'
        WHEN table_type = 'BASE TABLE' THEN 'Es tabla - ¿debería ser vista?'
        ELSE 'Tipo desconocido'
    END as recomendacion
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name = 'vista_embarque_completa';

-- Ver qué columnas tiene
SELECT 
    'vista_embarque_completa - CAMPOS (primeros 10)' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'vista_embarque_completa'
ORDER BY ordinal_position
LIMIT 10;

-- 6. RECOMENDACIONES FINALES
SELECT 
    '📋 RECOMENDACIONES POR TABLA' as tabla,
    '' as accion,
    '' as razon
UNION ALL
SELECT 
    'folio_sequence' as tabla,
    'MANTENER si se usa para generar folios' as accion,
    'Necesaria para secuencias automáticas' as razon
UNION ALL
SELECT 
    'public_comments' as tabla,
    'INVESTIGAR uso en aplicación' as accion,
    'Puede ser funcionalidad no implementada' as razon
UNION ALL
SELECT 
    'representantes_clientes' as tabla,
    'EVALUAR si duplica contactos_clientes' as accion,
    'Posible redundancia de datos' as razon
UNION ALL
SELECT 
    'tipos_servicio_import' as tabla,
    'ELIMINAR si ya se completó importación' as accion,
    'Tabla temporal de migración' as razon
UNION ALL
SELECT 
    'vista_embarque_completa' as tabla,
    'REEMPLAZAR con nueva vista normalizada' as accion,
    'Podría estar desactualizada' as razon;