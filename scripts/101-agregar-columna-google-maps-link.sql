-- Agregar columna google_maps_link a la tabla embarques
-- Esta columna almacenará la dirección de Google Maps compartida en la vista pública

-- Verificar si la columna ya existe antes de agregarla
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'embarques' 
        AND column_name = 'google_maps_link'
    ) THEN
        -- Agregar la columna
        ALTER TABLE embarques 
        ADD COLUMN google_maps_link TEXT;
        
        RAISE NOTICE '✅ Columna google_maps_link agregada exitosamente';
    ELSE
        RAISE NOTICE '⚠️ La columna google_maps_link ya existe';
    END IF;
END $$;

-- Agregar comentario a la columna para documentación
COMMENT ON COLUMN embarques.google_maps_link IS 'URL de Google Maps compartida públicamente. Visible en la vista pública del embarque y editable por cualquier usuario con acceso a la liga pública.';

-- Verificar que la columna se creó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'embarques' 
AND column_name = 'google_maps_link';
