-- Tabla para llevar un historial de actualizaciones de fechas de remolques
CREATE TABLE IF NOT EXISTS historial_actualizaciones_remolques (
    id SERIAL PRIMARY KEY,
    remolque_id INTEGER NOT NULL REFERENCES remolques(id) ON DELETE CASCADE,
    numero_economico VARCHAR(50) NOT NULL, -- Para facilitar consultas
    tipo_actualizacion VARCHAR(20) NOT NULL CHECK (tipo_actualizacion IN ('inspeccion', 'seguro')),
    fecha_anterior DATE, -- La fecha que se reemplazó
    fecha_nueva DATE NOT NULL, -- La nueva fecha
    comentario TEXT, -- Campo para comentarios opcionales
    usuario VARCHAR(100), -- Usuario que hizo el cambio (opcional por ahora)
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET, -- IP desde donde se hizo el cambio (opcional)
    
    -- Índices para mejor rendimiento
    INDEX idx_historial_remolque_id (remolque_id),
    INDEX idx_historial_fecha_registro (fecha_registro),
    INDEX idx_historial_tipo (tipo_actualizacion)
);

-- Comentarios para documentar la tabla
COMMENT ON TABLE historial_actualizaciones_remolques IS 'Historial de actualizaciones de fechas de inspección y seguro de remolques';
COMMENT ON COLUMN historial_actualizaciones_remolques.tipo_actualizacion IS 'Tipo: inspeccion o seguro';
COMMENT ON COLUMN historial_actualizaciones_remolques.fecha_anterior IS 'Fecha que se reemplazó (puede ser NULL si no había fecha anterior)';
COMMENT ON COLUMN historial_actualizaciones_remolques.fecha_nueva IS 'Nueva fecha establecida';
COMMENT ON COLUMN historial_actualizaciones_remolques.comentario IS 'Comentario opcional del usuario sobre el cambio';

-- Función para insertar automáticamente en el historial (opcional)
CREATE OR REPLACE FUNCTION registrar_actualizacion_remolque(
    p_remolque_id INTEGER,
    p_numero_economico VARCHAR(50),
    p_tipo_actualizacion VARCHAR(20),
    p_fecha_anterior DATE,
    p_fecha_nueva DATE,
    p_comentario TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    nuevo_id INTEGER;
BEGIN
    INSERT INTO historial_actualizaciones_remolques 
    (remolque_id, numero_economico, tipo_actualizacion, fecha_anterior, fecha_nueva, comentario)
    VALUES 
    (p_remolque_id, p_numero_economico, p_tipo_actualizacion, p_fecha_anterior, p_fecha_nueva, p_comentario)
    RETURNING id INTO nuevo_id;
    
    RETURN nuevo_id;
END;
$$ LANGUAGE plpgsql;