-- ========================================
-- SCRIPT PARA CREAR TABLA VERIFICACIONES_CAMIONES
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ========================================

-- Crear tabla para verificaciones de camiones
CREATE TABLE IF NOT EXISTS verificaciones_camiones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  camion_id UUID NOT NULL REFERENCES camiones(id) ON DELETE CASCADE,
  fecha_verificacion DATE NOT NULL,
  proxima_verificacion DATE,
  tipo_verificacion VARCHAR(100) NOT NULL DEFAULT 'verificacion_general',
  lugar_verificacion VARCHAR(255),
  numero_folio VARCHAR(100),
  resultado VARCHAR(50) DEFAULT 'aprobada', -- aprobada, rechazada, pendiente
  comentarios TEXT,
  costo DECIMAL(10,2),
  documentos_adjuntos TEXT[], -- Array de URLs de documentos
  recordatorio_enviado BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  creado_por VARCHAR(100) DEFAULT 'Usuario',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_verificaciones_camiones_camion_id ON verificaciones_camiones(camion_id);
CREATE INDEX IF NOT EXISTS idx_verificaciones_camiones_fecha ON verificaciones_camiones(fecha_verificacion);
CREATE INDEX IF NOT EXISTS idx_verificaciones_camiones_proxima ON verificaciones_camiones(proxima_verificacion);
CREATE INDEX IF NOT EXISTS idx_verificaciones_camiones_tipo ON verificaciones_camiones(tipo_verificacion);
CREATE INDEX IF NOT EXISTS idx_verificaciones_camiones_resultado ON verificaciones_camiones(resultado);
CREATE INDEX IF NOT EXISTS idx_verificaciones_camiones_activo ON verificaciones_camiones(activo);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_verificaciones_camiones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_verificaciones_camiones_updated_at ON verificaciones_camiones;
CREATE TRIGGER update_verificaciones_camiones_updated_at
  BEFORE UPDATE ON verificaciones_camiones
  FOR EACH ROW
  EXECUTE PROCEDURE update_verificaciones_camiones_updated_at();

-- Función para actualizar automáticamente las fechas en la tabla camiones
CREATE OR REPLACE FUNCTION actualizar_fechas_verificacion_camion()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar última verificación y próxima verificación en tabla camiones
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE camiones SET
      ultima_verificacion = NEW.fecha_verificacion,
      -- Calcular próxima verificación basada en frecuencia (por defecto 6 meses)
      proxima_verificacion = COALESCE(NEW.proxima_verificacion, NEW.fecha_verificacion + INTERVAL '6 months'),
      updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = NEW.camion_id;
    
    RETURN NEW;
  END IF;
  
  -- Si se elimina una verificación, recalcular la última verificación
  IF TG_OP = 'DELETE' THEN
    UPDATE camiones SET
      ultima_verificacion = (
        SELECT MAX(fecha_verificacion) 
        FROM verificaciones_camiones 
        WHERE camion_id = OLD.camion_id AND activo = true AND id != OLD.id
      ),
      proxima_verificacion = (
        SELECT MIN(proxima_verificacion) 
        FROM verificaciones_camiones 
        WHERE camion_id = OLD.camion_id AND activo = true AND id != OLD.id AND proxima_verificacion > CURRENT_DATE
      ),
      updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = OLD.camion_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger para sincronizar fechas con tabla camiones
DROP TRIGGER IF EXISTS sync_verificaciones_camiones ON verificaciones_camiones;
CREATE TRIGGER sync_verificaciones_camiones
  AFTER INSERT OR UPDATE OR DELETE ON verificaciones_camiones
  FOR EACH ROW
  EXECUTE PROCEDURE actualizar_fechas_verificacion_camion();

-- Row Level Security (RLS)
ALTER TABLE verificaciones_camiones ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones
CREATE POLICY "Allow all operations on verificaciones_camiones" ON verificaciones_camiones
  FOR ALL USING (true) WITH CHECK (true);

-- Comentarios para documentación
COMMENT ON TABLE verificaciones_camiones IS 'Tabla para almacenar historial de verificaciones de camiones';
COMMENT ON COLUMN verificaciones_camiones.camion_id IS 'ID del camión al que pertenece la verificación';
COMMENT ON COLUMN verificaciones_camiones.fecha_verificacion IS 'Fecha en que se realizó la verificación';
COMMENT ON COLUMN verificaciones_camiones.proxima_verificacion IS 'Fecha programada para la siguiente verificación';
COMMENT ON COLUMN verificaciones_camiones.tipo_verificacion IS 'Tipo de verificación (verificacion_general, verificacion_ambiental, etc.)';
COMMENT ON COLUMN verificaciones_camiones.lugar_verificacion IS 'Lugar donde se realizó la verificación';
COMMENT ON COLUMN verificaciones_camiones.numero_folio IS 'Número de folio o certificado de la verificación';
COMMENT ON COLUMN verificaciones_camiones.resultado IS 'Resultado de la verificación (aprobada, rechazada, pendiente)';
COMMENT ON COLUMN verificaciones_camiones.comentarios IS 'Observaciones y comentarios sobre la verificación';
COMMENT ON COLUMN verificaciones_camiones.costo IS 'Costo de la verificación en pesos mexicanos';
COMMENT ON COLUMN verificaciones_camiones.documentos_adjuntos IS 'Array de URLs de documentos relacionados con la verificación';
COMMENT ON COLUMN verificaciones_camiones.recordatorio_enviado IS 'Si ya se envió recordatorio para la próxima verificación';
COMMENT ON COLUMN verificaciones_camiones.activo IS 'Si el registro está activo o fue eliminado lógicamente';
COMMENT ON COLUMN verificaciones_camiones.creado_por IS 'Usuario que creó el registro';