-- Script para crear tabla de documentos de embarques
-- Este script es seguro de ejecutar múltiples veces (idempotente)
-- Ejecutar en el SQL Editor de Supabase

-- Crear tabla documentos_embarques si no existe
CREATE TABLE IF NOT EXISTS documentos_embarques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embarque_id UUID NOT NULL REFERENCES embarques(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_documentos_embarques_embarque_id 
  ON documentos_embarques(embarque_id);

CREATE INDEX IF NOT EXISTS idx_documentos_embarques_uploaded_at 
  ON documentos_embarques(uploaded_at DESC);

-- Agregar comentarios descriptivos
COMMENT ON TABLE documentos_embarques IS 'Documentos e imágenes asociados a embarques';
COMMENT ON COLUMN documentos_embarques.embarque_id IS 'ID del embarque al que pertenece el documento';
COMMENT ON COLUMN documentos_embarques.nombre_archivo IS 'Nombre del archivo subido';
COMMENT ON COLUMN documentos_embarques.url_blob IS 'URL pública del archivo en Vercel Blob';
COMMENT ON COLUMN documentos_embarques.pathname IS 'Ruta del archivo en Vercel Blob para eliminación';
COMMENT ON COLUMN documentos_embarques.tipo_archivo IS 'MIME type del archivo (image/jpeg, application/pdf, etc.)';
COMMENT ON COLUMN documentos_embarques.tamano_bytes IS 'Tamaño del archivo en bytes';
COMMENT ON COLUMN documentos_embarques.uploaded_by IS 'Usuario que subió el documento';

-- Habilitar Row Level Security (RLS)
ALTER TABLE documentos_embarques ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen (para permitir reejecutar el script)
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver documentos de embarques" ON documentos_embarques;
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir documentos de embarques" ON documentos_embarques;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar documentos de embarques" ON documentos_embarques;

-- Política para permitir lectura a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden ver documentos de embarques"
  ON documentos_embarques FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir inserción a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden subir documentos de embarques"
  ON documentos_embarques FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para permitir eliminación a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden eliminar documentos de embarques"
  ON documentos_embarques FOR DELETE
  TO authenticated
  USING (true);

-- Verificar que la tabla se creó correctamente
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'documentos_embarques'
ORDER BY ordinal_position;
