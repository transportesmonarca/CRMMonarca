-- Script para crear tabla de documentos de camiones
-- Este script es seguro de ejecutar múltiples veces (idempotente)
-- Ejecutar en el SQL Editor de Supabase

-- Crear tabla documentos_camiones si no existe
CREATE TABLE IF NOT EXISTS documentos_camiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camion_id UUID NOT NULL REFERENCES camiones(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  numero_documento TEXT,
  nombre_archivo TEXT NOT NULL,
  url_blob TEXT NOT NULL,
  pathname TEXT NOT NULL,
  tipo_archivo TEXT,
  tamano_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_documentos_camiones_camion_id 
  ON documentos_camiones(camion_id);

CREATE INDEX IF NOT EXISTS idx_documentos_camiones_tipo_documento 
  ON documentos_camiones(tipo_documento);

CREATE INDEX IF NOT EXISTS idx_documentos_camiones_uploaded_at 
  ON documentos_camiones(uploaded_at);

-- Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger si no existe ya
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_documentos_camiones_updated_at') THEN
        CREATE TRIGGER update_documentos_camiones_updated_at 
            BEFORE UPDATE ON documentos_camiones 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

-- Comentarios sobre la tabla
COMMENT ON TABLE documentos_camiones IS 'Tabla para almacenar documentos e imágenes de camiones';
COMMENT ON COLUMN documentos_camiones.camion_id IS 'Referencia al camión';
COMMENT ON COLUMN documentos_camiones.tipo_documento IS 'Tipo de documento (licencia, seguro, tarjeta_circulacion, etc.)';
COMMENT ON COLUMN documentos_camiones.numero_documento IS 'Número del documento si aplica (opcional)';
COMMENT ON COLUMN documentos_camiones.nombre_archivo IS 'Nombre original del archivo';
COMMENT ON COLUMN documentos_camiones.url_blob IS 'URL del archivo en Vercel Blob';
COMMENT ON COLUMN documentos_camiones.pathname IS 'Ruta del archivo para eliminación';
COMMENT ON COLUMN documentos_camiones.tipo_archivo IS 'MIME type del archivo';
COMMENT ON COLUMN documentos_camiones.tamano_bytes IS 'Tamaño del archivo en bytes';

-- Verificar que la tabla fue creada correctamente
SELECT 'Tabla documentos_camiones creada/verificada exitosamente' AS status;