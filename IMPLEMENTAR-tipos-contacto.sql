-- 🎯 IMPLEMENTAR REPRESENTANTES EN contactos_clientes

-- ✅ ESTRATEGIA CONFIRMADA: Una sola tabla para todo
-- contactos_clientes guardará: contactos generales Y representantes

-- 1️⃣ Agregar campo tipo_contacto para diferenciar
ALTER TABLE contactos_clientes 
ADD COLUMN tipo_contacto VARCHAR(20) DEFAULT 'contacto'
CHECK (tipo_contacto IN ('contacto', 'representante', 'principal'));

-- 2️⃣ Actualizar registros existentes basándose en es_principal
UPDATE contactos_clientes 
SET tipo_contacto = CASE 
    WHEN es_principal = true THEN 'principal'
    ELSE 'contacto'
END;

-- 3️⃣ Agregar índice para mejorar consultas por tipo
CREATE INDEX IF NOT EXISTS idx_contactos_tipo_cliente 
ON contactos_clientes(cliente_id, tipo_contacto);

-- 4️⃣ Ver estructura actualizada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'contactos_clientes'
ORDER BY ordinal_position;

-- 5️⃣ Ver datos actualizados
SELECT 
    nombre,
    puesto,
    tipo_contacto,
    es_principal,
    cliente_id
FROM contactos_clientes
ORDER BY tipo_contacto, nombre;

-- 6️⃣ Ejemplos de consultas por tipo:

-- Solo contactos generales
-- SELECT * FROM contactos_clientes WHERE tipo_contacto = 'contacto';

-- Solo representantes  
-- SELECT * FROM contactos_clientes WHERE tipo_contacto = 'representante';

-- Solo contacto principal
-- SELECT * FROM contactos_clientes WHERE tipo_contacto = 'principal';

-- Todos los contactos de un cliente ordenados por importancia
-- SELECT * FROM contactos_clientes 
-- WHERE cliente_id = 'UUID_CLIENTE'
-- ORDER BY 
--   CASE tipo_contacto 
--     WHEN 'principal' THEN 1 
--     WHEN 'representante' THEN 2 
--     WHEN 'contacto' THEN 3 
--   END;