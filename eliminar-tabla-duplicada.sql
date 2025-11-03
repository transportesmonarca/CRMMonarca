-- 🔍 ANÁLISIS: ¿CUÁL TABLA ELIMINAR?

-- 1️⃣ Comparar uso en el código - buscar referencias
-- contactos_clientes: 3 registros, usado activamente
-- representantes_clientes: 0 registros, tabla vacía

-- 2️⃣ Ver qué tabla tiene mejor estructura
SELECT 'contactos_clientes' as tabla, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'contactos_clientes'
UNION ALL
SELECT 'representantes_clientes' as tabla, column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'representantes_clientes'
ORDER BY tabla, column_name;

-- 3️⃣ Ver constraints y relaciones
SELECT 
    tc.constraint_name,
    tc.table_name,
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
AND tc.table_name IN ('contactos_clientes', 'representantes_clientes');

-- 4️⃣ RECOMENDACIÓN: ELIMINAR representantes_clientes
-- Razones:
-- ✅ contactos_clientes tiene datos (3 registros)
-- ✅ contactos_clientes está siendo usado en el código
-- ✅ contactos_clientes tiene mejor arquitectura (sin apellidos separados)
-- ❌ representantes_clientes está vacía (0 registros)
-- ❌ representantes_clientes no se usa en el código actualmente

-- 5️⃣ Script para eliminar representantes_clientes (EJECUTAR SOLO SI ESTÁS SEGURO)
/*
-- Primero eliminar la función que la usa (si existe)
DROP FUNCTION IF EXISTS obtenerRepresentantesCliente CASCADE;

-- Luego eliminar la tabla
DROP TABLE IF EXISTS representantes_clientes CASCADE;

-- Verificar que se eliminó
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'representantes_clientes';
*/