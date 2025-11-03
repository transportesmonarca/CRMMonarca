-- Script para agregar la columna proxima_verificacion a la tabla camiones
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Agregar la columna proxima_verificacion
ALTER TABLE camiones 
ADD COLUMN IF NOT EXISTS proxima_verificacion DATE;

-- 2. Agregar comentario descriptivo
COMMENT ON COLUMN camiones.proxima_verificacion IS 'Fecha de la próxima verificación del camión basada en las verificaciones registradas';

-- 3. Opcional: Crear índice para mejorar rendimiento en consultas por fecha
CREATE INDEX IF NOT EXISTS idx_camiones_proxima_verificacion 
ON camiones(proxima_verificacion) 
WHERE proxima_verificacion IS NOT NULL;

-- 4. Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'camiones' 
AND column_name = 'proxima_verificacion';