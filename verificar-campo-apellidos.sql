-- 🔍 VERIFICAR ESPECÍFICAMENTE EL CAMPO APELLIDOS

-- 1️⃣ ¿Contactos_clientes tiene apellidos?
SELECT 
    'contactos_clientes' as tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'contactos_clientes'
AND column_name = 'apellidos';

-- 2️⃣ ¿Representantes_clientes tiene apellidos?
SELECT 
    'representantes_clientes' as tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'representantes_clientes'
AND column_name = 'apellidos';

-- 3️⃣ Estructura completa de contactos_clientes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'contactos_clientes'
ORDER BY ordinal_position;

-- 4️⃣ Ver los 3 registros existentes en contactos_clientes
SELECT * FROM contactos_clientes;