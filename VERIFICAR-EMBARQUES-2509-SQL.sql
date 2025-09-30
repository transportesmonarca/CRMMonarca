-- Script SQL directo para verificar embarques TIM-2509
-- Este script se ejecuta directamente en Supabase para confirmar el estado

-- 1. Buscar en tabla legacy
SELECT 
    'LEGACY' as tabla,
    id, 
    cliente_id, 
    folio, 
    fecha, 
    created_at,
    precio_operador,
    tipo_servicio_id
FROM embarques 
WHERE id LIKE '%2509%'
ORDER BY created_at DESC;

-- 2. Buscar en tabla normalizada
SELECT 
    'NORMALIZADA' as tabla,
    id, 
    cliente_id, 
    folio, 
    fecha, 
    created_at,
    precio_operador_final,
    tipo_servicio_precio,
    tipo_servicio_nombre
FROM embarques_nuevo 
WHERE id LIKE '%2509%'
ORDER BY created_at DESC;

-- 3. Contar total de embarques en ambas tablas
SELECT 
    'LEGACY' as tabla,
    COUNT(*) as total_embarques,
    MAX(created_at) as ultimo_embarque
FROM embarques
UNION ALL
SELECT 
    'NORMALIZADA' as tabla,
    COUNT(*) as total_embarques,
    MAX(created_at) as ultimo_embarque
FROM embarques_nuevo;

-- 4. Ver últimos 10 embarques en cada tabla
SELECT 
    'LEGACY - ' || id as embarque,
    created_at,
    fecha
FROM embarques 
ORDER BY created_at DESC 
LIMIT 10;

SELECT 
    'NORMALIZADA - ' || id as embarque,
    created_at,
    fecha
FROM embarques_nuevo 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Verificar si existen las tablas relacionadas
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.tables t2 WHERE t2.table_name = t.table_name) as existe
FROM (
    SELECT 'embarques_nuevo' as table_name
    UNION ALL SELECT 'embarques_ubicaciones'
    UNION ALL SELECT 'embarques_financiero'
    UNION ALL SELECT 'embarques_estado'
    UNION ALL SELECT 'embarques_documentos'
    UNION ALL SELECT 'embarques_adicional'
) t;