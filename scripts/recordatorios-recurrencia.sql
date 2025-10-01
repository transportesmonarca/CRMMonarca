-- Mejora para Recordatorios Recurrentes
-- Agregar campos para manejar recurrencia

ALTER TABLE recordatorios ADD COLUMN IF NOT EXISTS es_recurrente BOOLEAN DEFAULT false;
ALTER TABLE recordatorios ADD COLUMN IF NOT EXISTS tipo_recurrencia VARCHAR(20); -- 'diario', 'semanal', 'mensual', 'anual'
ALTER TABLE recordatorios ADD COLUMN IF NOT EXISTS intervalo_recurrencia INTEGER DEFAULT 1; -- cada X unidades
ALTER TABLE recordatorios ADD COLUMN IF NOT EXISTS recordatorio_padre_id UUID REFERENCES recordatorios(id);
ALTER TABLE recordatorios ADD COLUMN IF NOT EXISTS fecha_fin_recurrencia DATE; -- cuándo dejar de crear recordatorios

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_recordatorios_recurrente ON recordatorios(es_recurrente);
CREATE INDEX IF NOT EXISTS idx_recordatorios_padre ON recordatorios(recordatorio_padre_id);

-- Función para crear el próximo recordatorio recurrente
CREATE OR REPLACE FUNCTION crear_recordatorio_recurrente(recordatorio_id UUID)
RETURNS UUID AS $$
DECLARE
    recordatorio_orig RECORD;
    nueva_fecha DATE;
    nuevo_id UUID;
BEGIN
    -- Obtener el recordatorio original
    SELECT * INTO recordatorio_orig 
    FROM recordatorios 
    WHERE id = recordatorio_id;
    
    -- Verificar si es recurrente
    IF NOT recordatorio_orig.es_recurrente THEN
        RETURN NULL;
    END IF;
    
    -- Calcular la nueva fecha según el tipo de recurrencia
    CASE recordatorio_orig.tipo_recurrencia
        WHEN 'diario' THEN
            nueva_fecha := recordatorio_orig.fecha_vencimiento + (recordatorio_orig.intervalo_recurrencia || ' days')::INTERVAL;
        WHEN 'semanal' THEN
            nueva_fecha := recordatorio_orig.fecha_vencimiento + (recordatorio_orig.intervalo_recurrencia * 7 || ' days')::INTERVAL;
        WHEN 'mensual' THEN
            nueva_fecha := recordatorio_orig.fecha_vencimiento + (recordatorio_orig.intervalo_recurrencia || ' months')::INTERVAL;
        WHEN 'anual' THEN
            nueva_fecha := recordatorio_orig.fecha_vencimiento + (recordatorio_orig.intervalo_recurrencia || ' years')::INTERVAL;
        ELSE
            RETURN NULL;
    END CASE;
    
    -- Verificar si ya pasó la fecha límite
    IF recordatorio_orig.fecha_fin_recurrencia IS NOT NULL AND nueva_fecha > recordatorio_orig.fecha_fin_recurrencia THEN
        RETURN NULL;
    END IF;
    
    -- Crear el nuevo recordatorio
    INSERT INTO recordatorios (
        titulo, descripcion, fecha_vencimiento, tipo, prioridad, estado,
        operador_id, camion_id, es_recurrente, tipo_recurrencia, 
        intervalo_recurrencia, recordatorio_padre_id, fecha_fin_recurrencia
    ) VALUES (
        recordatorio_orig.titulo,
        recordatorio_orig.descripcion,
        nueva_fecha,
        recordatorio_orig.tipo,
        recordatorio_orig.prioridad,
        'pendiente',
        recordatorio_orig.operador_id,
        recordatorio_orig.camion_id,
        recordatorio_orig.es_recurrente,
        recordatorio_orig.tipo_recurrencia,
        recordatorio_orig.intervalo_recurrencia,
        COALESCE(recordatorio_orig.recordatorio_padre_id, recordatorio_orig.id),
        recordatorio_orig.fecha_fin_recurrencia
    ) RETURNING id INTO nuevo_id;
    
    RETURN nuevo_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear automáticamente el siguiente recordatorio cuando se marca como completado
CREATE OR REPLACE FUNCTION trigger_recordatorio_completado()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo ejecutar cuando se marca como completado
    IF NEW.estado = 'completado' AND OLD.estado != 'completado' THEN
        -- Crear el siguiente recordatorio si es recurrente
        PERFORM crear_recordatorio_recurrente(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS recordatorio_completado_trigger ON recordatorios;
CREATE TRIGGER recordatorio_completado_trigger
    AFTER UPDATE ON recordatorios
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recordatorio_completado();