-- 🎯 ESTRATEGIA: Ampliar contactos_clientes para representantes

-- ✅ VENTAJAS DE ESTA ESTRATEGIA:
-- 1. Una sola tabla, una sola interfaz
-- 2. Fácil consultar y filtrar por tipo
-- 3. Constraints y validaciones normales
-- 4. UI reutilizable (mismo componente)
-- 5. Escalable (agregar más tipos si es necesario)

-- 1️⃣ Agregar campo tipo_contacto
ALTER TABLE contactos_clientes 
ADD COLUMN tipo_contacto VARCHAR(20) DEFAULT 'contacto'
CHECK (tipo_contacto IN ('contacto', 'representante', 'principal'));

-- 2️⃣ Actualizar registros existentes
UPDATE contactos_clientes 
SET tipo_contacto = CASE 
    WHEN es_principal = true THEN 'principal'
    ELSE 'contacto'
END;

-- 3️⃣ Verificar la estructura actualizada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'contactos_clientes'
ORDER BY ordinal_position;

-- 4️⃣ Ver los datos con el nuevo campo
SELECT 
    nombre,
    puesto,
    tipo_contacto,
    es_principal
FROM contactos_clientes;

-- 5️⃣ Ejemplo de uso - Obtener solo representantes
-- SELECT * FROM contactos_clientes 
-- WHERE cliente_id = 'ID_CLIENTE' AND tipo_contacto = 'representante';

-- 6️⃣ Ejemplo de uso - Obtener todos los contactos de un cliente
-- SELECT * FROM contactos_clientes 
-- WHERE cliente_id = 'ID_CLIENTE' 
-- ORDER BY 
--   CASE tipo_contacto 
--     WHEN 'principal' THEN 1 
--     WHEN 'representante' THEN 2 
--     WHEN 'contacto' THEN 3 
--   END;