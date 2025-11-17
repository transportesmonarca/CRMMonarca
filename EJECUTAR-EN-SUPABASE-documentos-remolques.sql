-- Script para crear tabla de documentos de remolques
-- Este script es seguro de ejecutar múltiples veces (idempotente)
-- Ejecutar en el SQL Editor de Supabase

-- Crear tabla documentos_remolques si no existe
CREATE TABLE IF NOT EXISTS documentos_remolques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remolque_id UUID NOT NULL REFERENCES remolques(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  numero_documento TEXT,
  nombre_archivo TEXT NOT NULL,
  url_blob TEXT NOT NULL,
  pathname TEXT NOT NULL,
  tipo_mime TEXT,
  tamano_bytes BIGINT,
  subido_por TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_documentos_remolques_remolque_id 
  ON documentos_remolques(remolque_id);

CREATE INDEX IF NOT EXISTS idx_documentos_remolques_tipo_documento 
  ON documentos_remolques(tipo_documento);

CREATE INDEX IF NOT EXISTS idx_documentos_remolques_activo 
  ON documentos_remolques(activo);

CREATE INDEX IF NOT EXISTS idx_documentos_remolques_created_at 
  ON documentos_remolques(created_at);

-- Crear función para trigger de updated_at si no existe
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
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_documentos_remolques_updated_at') THEN
        CREATE TRIGGER update_documentos_remolques_updated_at 
            BEFORE UPDATE ON documentos_remolques 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

-- Comentarios sobre la tabla
COMMENT ON TABLE documentos_remolques IS 'Tabla para almacenar documentos e imágenes de remolques';
COMMENT ON COLUMN documentos_remolques.remolque_id IS 'Referencia al remolque';
COMMENT ON COLUMN documentos_remolques.tipo_documento IS 'Tipo de documento (poliza, verificacion, manual, etc.)';
COMMENT ON COLUMN documentos_remolques.numero_documento IS 'Número del documento si aplica (opcional)';
COMMENT ON COLUMN documentos_remolques.nombre_archivo IS 'Nombre original del archivo';
COMMENT ON COLUMN documentos_remolques.url_blob IS 'URL del archivo en Vercel Blob';
COMMENT ON COLUMN documentos_remolques.pathname IS 'Ruta del archivo para eliminación';
COMMENT ON COLUMN documentos_remolques.tipo_mime IS 'MIME type del archivo';
COMMENT ON COLUMN documentos_remolques.tamano_bytes IS 'Tamaño del archivo en bytes';
COMMENT ON COLUMN documentos_remolques.subido_por IS 'Usuario que subió el documento';
COMMENT ON COLUMN documentos_remolques.activo IS 'Si el documento está activo (no eliminado)';

-- Verificar que la tabla fue creada correctamente
SELECT 'Tabla documentos_remolques creada/verificada exitosamente' AS status;

-- Mostrar información de la tabla
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename = 'documentos_remolques';

-- Mostrar columnas de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'documentos_remolques' 
ORDER BY ordinal_position;