-- 🔍 VERIFICAR TABLAS DE REPRESENTANTES Y CONTACTOS

-- 1️⃣ Verificar si existe la tabla representantes_clientes
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('representantes_clientes', 'contactos_clientes')
ORDER BY table_name;

-- 2️⃣ Ver estructura de la tabla representantes_clientes (si existe)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'representantes_clientes'
ORDER BY ordinal_position;

-- 3️⃣ Ver estructura de la tabla contactos_clientes (para comparar)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'contactos_clientes'
ORDER BY ordinal_position;

-- 4️⃣ Verificar constraints de representantes_clientes (si existe)
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'representantes_clientes'::regclass;

-- 5️⃣ Ver datos existentes en representantes_clientes (si existe)
-- SELECT * FROM representantes_clientes LIMIT 5;

-- 6️⃣ Contar registros en ambas tablas
SELECT 
    'contactos_clientes' as tabla,
    COUNT(*) as total_registros
FROM contactos_clientes
UNION ALL
SELECT 
    'representantes_clientes' as tabla,
    COUNT(*) as total_registros
FROM representantes_clientes;