-- 🔍 VERIFICAR ESTRUCTURA DE AMBAS TABLAS

-- 1️⃣ Estructura de contactos_clientes
SELECT 
    'contactos_clientes' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'contactos_clientes'
ORDER BY ordinal_position;

-- 2️⃣ Estructura de representantes_clientes  
SELECT 
    'representantes_clientes' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'representantes_clientes'
ORDER BY ordinal_position;

-- 3️⃣ Verificar si contactos_clientes tiene apellidos
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'contactos_clientes'
    AND column_name = 'apellidos'
) as contactos_tiene_apellidos;

-- 4️⃣ Verificar si representantes_clientes tiene apellidos
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'representantes_clientes'
    AND column_name = 'apellidos'
) as representantes_tiene_apellidos;