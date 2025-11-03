-- Script para agregar la columna contactos_json a la tabla clientes
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar la columna contactos_json de tipo JSON
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS contactos_json JSON;

-- 2. Agregar comentario para documentar el campo
COMMENT ON COLUMN clientes.contactos_json IS 'Almacena los contactos del cliente en formato JSON para permitir contactos ilimitados';

-- 3. Crear índice para mejorar las consultas (opcional)
CREATE INDEX IF NOT EXISTS idx_clientes_contactos_json ON clientes USING GIN (contactos_json);

-- 4. Función auxiliar para crear la columna automáticamente desde la aplicación
CREATE OR REPLACE FUNCTION crear_columna_contactos_json()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar si la columna ya existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clientes' 
        AND column_name = 'contactos_json'
    ) THEN
        -- Agregar la columna
        ALTER TABLE clientes ADD COLUMN contactos_json JSON;
        
        -- Agregar comentario
        COMMENT ON COLUMN clientes.contactos_json IS 'Almacena los contactos del cliente en formato JSON para permitir contactos ilimitados';
        
        -- Crear índice
        CREATE INDEX idx_clientes_contactos_json ON clientes USING GIN (contactos_json);
        
        RAISE NOTICE 'Columna contactos_json agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna contactos_json ya existe';
    END IF;
END;
$$;

-- 5. Otorgar permisos necesarios
GRANT EXECUTE ON FUNCTION crear_columna_contactos_json() TO authenticated;

-- 6. Ejemplo de estructura JSON esperada:
/*
{
  "contactos": [
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
    },
    {
      "id": "contact-1234567890-1",
      "nombre": "María González",
      "apellidos": "Rodríguez Silva",
      "telefono": "+52 555 987 6543",
      "email": "maria.gonzalez@empresa.com",
      "puesto": "Coordinadora de Logística",
      "es_principal": false,
      "activo": true,
      "notas": "Contacto para coordinar entregas",
      "fecha_creacion": "2025-01-20T10:31:00.000Z",
      "updated_at": "2025-01-20T10:31:00.000Z"
    }
  ]
}
*/

-- 7. Consultas de ejemplo para trabajar con JSON:

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