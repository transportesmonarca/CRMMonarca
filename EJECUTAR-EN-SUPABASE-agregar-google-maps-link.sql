-- Script para agregar columna google_maps_link a la tabla embarques
-- Este script es seguro de ejecutar múltiples veces (idempotente)
-- Ejecutar en el SQL Editor de Supabase

-- Agregar columna google_maps_link si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'embarques' 
        AND column_name = 'google_maps_link'
    ) THEN
        ALTER TABLE embarques 
        ADD COLUMN google_maps_link TEXT;
        
        COMMENT ON COLUMN embarques.google_maps_link IS 'URL de Google Maps compartida públicamente para ubicación de referencia del embarque';
        
        RAISE NOTICE 'Columna google_maps_link agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna google_maps_link ya existe, no se realizaron cambios';
    END IF;
END $$;

-- Verificar que la columna se creó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'embarques' 
AND column_name = 'google_maps_link';
