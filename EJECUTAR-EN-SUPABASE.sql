-- ========================================
-- SCRIPT PARA CREAR TABLA DOCUMENTOS_REMOLQUES
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ========================================

-- Crear tabla para documentos de remolques
CREATE TABLE IF NOT EXISTS documentos_remolques (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  remolque_id UUID NOT NULL REFERENCES remolques(id) ON DELETE CASCADE,
  tipo_documento VARCHAR(100) NOT NULL DEFAULT 'documento_general',
  numero_documento VARCHAR(100),
  nombre_archivo VARCHAR(255) NOT NULL,
  url_blob TEXT NOT NULL,
  pathname TEXT NOT NULL,
  tamano_bytes BIGINT,
  tipo_mime VARCHAR(100),
  fecha_vencimiento DATE,
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  subido_por VARCHAR(100) DEFAULT 'Usuario',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_documentos_remolques_remolque_id ON documentos_remolques(remolque_id);
CREATE INDEX IF NOT EXISTS idx_documentos_remolques_activo ON documentos_remolques(activo);
CREATE INDEX IF NOT EXISTS idx_documentos_remolques_tipo ON documentos_remolques(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_documentos_remolques_fecha_vencimiento ON documentos_remolques(fecha_vencimiento);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_documentos_remolques_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_documentos_remolques_updated_at ON documentos_remolques;
CREATE TRIGGER update_documentos_remolques_updated_at
  BEFORE UPDATE ON documentos_remolques
  FOR EACH ROW
  EXECUTE PROCEDURE update_documentos_remolques_updated_at();

-- Row Level Security (RLS)
ALTER TABLE documentos_remolques ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones
CREATE POLICY "Allow all operations on documentos_remolques" ON documentos_remolques
  FOR ALL USING (true) WITH CHECK (true);

-- Comentarios para documentación
COMMENT ON TABLE documentos_remolques IS 'Tabla para almacenar documentos de remolques';
COMMENT ON COLUMN documentos_remolques.remolque_id IS 'ID del remolque al que pertenece el documento';
COMMENT ON COLUMN documentos_remolques.tipo_documento IS 'Tipo de documento (poliza_seguro, verificacion, etc.)';
COMMENT ON COLUMN documentos_remolques.nombre_archivo IS 'Nombre original del archivo subido';
COMMENT ON COLUMN documentos_remolques.url_blob IS 'URL pública del archivo en Vercel Blob';
COMMENT ON COLUMN documentos_remolques.pathname IS 'Ruta del archivo para eliminación';