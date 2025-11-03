-- 🧪 SCRIPT DE PRUEBA: Insertar contacto manualmente para diagnosticar

-- 1️⃣ Verificar que la tabla existe y está accesible
SELECT COUNT(*) as total_contactos_existentes 
FROM contactos_clientes;

-- 2️⃣ Ver un cliente existente para usar su ID
SELECT id, nombre 
FROM clientes 
LIMIT 3;

-- 3️⃣ Probar inserción manual (CAMBIA el cliente_id por uno real)
/*
INSERT INTO contactos_clientes (
    id,
    cliente_id,
    nombre,
    telefono,
    email,
    puesto,
    es_principal,
    activo,
    fecha_creacion,
    updated_at
) VALUES (
    'test-contact-' || extract(epoch from now()),
    'TU-CLIENTE-ID-AQUI', -- Cambia por un ID real de la consulta anterior
    'Contacto de Prueba',
    '+52 555 123 4567',
    'prueba@test.com',
    'Gerente de Prueba',
    true,
    true,
    now(),
    now()
);
*/

-- 4️⃣ Verificar la inserción
-- SELECT * FROM contactos_clientes WHERE nombre = 'Contacto de Prueba';

-- 5️⃣ Verificar restricciones de la tabla
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'contactos_clientes'::regclass;