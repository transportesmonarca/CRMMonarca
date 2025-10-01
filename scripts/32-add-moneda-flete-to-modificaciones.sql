-- Agregar columna moneda_flete a embarque_modificaciones para compatibilidad
-- Esta columna almacena la moneda actual del flete (para compatibilidad con código existente)

DO $$ 
BEGIN
    -- Verificar y agregar columna moneda_flete
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'embarque_modificaciones' AND column_name = 'moneda_flete') THEN
        ALTER TABLE embarque_modificaciones ADD COLUMN moneda_flete VARCHAR(3) DEFAULT 'MXN';
        -- Actualizar registros existentes con la moneda nueva si existe, sino MXN por defecto
        UPDATE embarque_modificaciones SET moneda_flete = COALESCE(moneda_flete_nueva, 'MXN') WHERE moneda_flete IS NULL;
    END IF;
END $$;

-- Crear índice para mejorar búsquedas por moneda
CREATE INDEX IF NOT EXISTS idx_embarque_modificaciones_moneda_flete ON embarque_modificaciones(moneda_flete);