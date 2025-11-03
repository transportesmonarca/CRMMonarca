-- 🗑️ ELIMINAR TABLA REPRESENTANTES_CLIENTES - SCRIPT FINAL

-- ⚠️ ADVERTENCIA: Este script eliminará permanentemente la tabla representantes_clientes
-- ✅ SEGURO DE EJECUTAR: La tabla está vacía (0 registros) y no se usa activamente

-- 1️⃣ Verificar estado actual (debe mostrar 0 registros)
SELECT 
    'ANTES DE ELIMINAR' as momento,
    COUNT(*) as registros_representantes,
    (SELECT COUNT(*) FROM contactos_clientes) as registros_contactos
FROM representantes_clientes;

-- 2️⃣ Eliminar tabla y todas sus dependencias
DROP TABLE IF EXISTS representantes_clientes CASCADE;

-- 3️⃣ Verificar que se eliminó correctamente
SELECT 
    'DESPUÉS DE ELIMINAR' as momento,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'representantes_clientes'
        ) 
        THEN '❌ AÚN EXISTE' 
        ELSE '✅ ELIMINADA' 
    END as estado_tabla;

-- 4️⃣ Confirmar que contactos_clientes sigue intacta
SELECT 
    '✅ TABLA PRINCIPAL INTACTA' as status,
    COUNT(*) as total_contactos_conservados
FROM contactos_clientes;

-- 5️⃣ Ver tabla final consolidada
SELECT 
    'ESTRUCTURA FINAL' as info,
    table_name,
    (SELECT COUNT(*) FROM contactos_clientes) as total_registros
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'contactos_clientes';

-- ✅ RESULTADO ESPERADO:
-- - representantes_clientes: ❌ ELIMINADA
-- - contactos_clientes: ✅ CONSERVADA con 3 registros
-- - Código TypeScript: ✅ LIMPIO sin referencias duplicadas