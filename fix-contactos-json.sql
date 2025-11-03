-- 🔧 SCRIPT DEFINITIVO: Solucionar problema de contactos JSON
-- Ejecutar línea por línea en Supabase SQL Editor

-- 1. PRIMERO: Eliminar la columna si existe con tipo incorrecto
ALTER TABLE clientes DROP COLUMN IF EXISTS contactos_json;

-- 2. SEGUNDO: Crear la columna con el tipo correcto JSONB
ALTER TABLE clientes ADD COLUMN contactos_json JSONB;

-- 3. TERCERO: Agregar comentario
COMMENT ON COLUMN clientes.contactos_json IS 'Contactos del cliente en formato JSONB - soporta contactos ilimitados';

-- 4. CUARTO: Crear índice GIN (solo funciona con JSONB)
CREATE INDEX idx_clientes_contactos_jsonb ON clientes USING GIN (contactos_json);

-- 5. QUINTO: Verificar que todo esté correcto
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'clientes' 
AND column_name = 'contactos_json';

-- 6. SEXTO: Verificar índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'clientes' 
AND indexname LIKE '%contactos%';

-- 7. SÉPTIMO: Probar inserción de ejemplo
-- (Descomenta para probar con un cliente existente)
/*
UPDATE clientes 
SET contactos_json = '[
    {
        "id": "test-contact-1",
        "nombre": "Juan Pérez",
        "apellidos": "García",
        "telefono": "+52 555 1234567",
        "email": "juan@test.com",
        "puesto": "Gerente",
        "es_principal": true,
        "activo": true,
        "fecha_creacion": "2025-01-20T10:00:00Z",
        "updated_at": "2025-01-20T10:00:00Z"
    },
    {
        "id": "test-contact-2", 
        "nombre": "María González",
        "apellidos": "López",
        "telefono": "+52 555 7654321",
        "email": "maria@test.com",
        "puesto": "Coordinadora",
        "es_principal": false,
        "activo": true,
        "fecha_creacion": "2025-01-20T10:00:00Z",
        "updated_at": "2025-01-20T10:00:00Z"
    }
]'::JSONB
WHERE id = (SELECT id FROM clientes LIMIT 1);
*/

-- 8. OCTAVO: Consulta de prueba
SELECT id, nombre, jsonb_array_length(contactos_json) as total_contactos
FROM clientes 
WHERE contactos_json IS NOT NULL;

COMMIT;