-- ✅ SCRIPT CORREGIDO: Agregar columna contactos_json a la tabla clientes
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar la columna contactos_json de tipo JSONB (no JSON)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS contactos_json JSONB;

-- 2. Agregar comentario para documentar el campo
COMMENT ON COLUMN clientes.contactos_json IS 'Almacena los contactos del cliente en formato JSONB para permitir contactos ilimitados';

-- 3. Crear índice GIN para JSONB (funciona correctamente)
CREATE INDEX IF NOT EXISTS idx_clientes_contactos_json ON clientes USING GIN (contactos_json);

-- 4. Verificar que la columna se creó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clientes' 
AND column_name = 'contactos_json';

-- 5. Ejemplo de inserción de contactos JSON
/*
UPDATE clientes 
SET contactos_json = '[
  {
    "id": "contact-1234567890-0",
    "nombre": "Juan Pérez",
    "apellidos": "García López",
    "telefono": "+52 555 123 4567",
    "email": "juan.perez@empresa.com",
    "puesto": "Gerente de Ventas",
    "es_principal": true,
    "activo": true,
    "notas": "Contacto principal para facturación",
    "fecha_creacion": "2025-01-20T10:30:00.000Z",
    "updated_at": "2025-01-20T10:30:00.000Z"
  }
]'::JSONB
WHERE id = 'tu-cliente-id-aqui';
*/

-- 6. Consultas de ejemplo para trabajar con JSONB:

-- Obtener todos los contactos de un cliente específico
-- SELECT contactos_json FROM clientes WHERE id = 'cliente-uuid';

-- Contar contactos por cliente
-- SELECT id, nombre, jsonb_array_length(contactos_json) as total_contactos 
-- FROM clientes 
-- WHERE contactos_json IS NOT NULL;

-- Buscar clientes por email de contacto
-- SELECT c.id, c.nombre 
-- FROM clientes c, jsonb_array_elements(c.contactos_json) as contacto
-- WHERE contacto->>'email' = 'email@ejemplo.com';

-- Obtener solo contactos principales
-- SELECT c.id, c.nombre, contacto
-- FROM clientes c, jsonb_array_elements(c.contactos_json) as contacto
-- WHERE (contacto->>'es_principal')::boolean = true;

-- Obtener contactos con nombres que contengan cierto texto
-- SELECT c.id, c.nombre, contacto->>'nombre' as contacto_nombre
-- FROM clientes c, jsonb_array_elements(c.contactos_json) as contacto
-- WHERE contacto->>'nombre' ILIKE '%juan%';

COMMIT;