-- 19-create-archivos-operadores.sql
-- Crea la tabla archivos_operadores para almacenar metadatos de archivos (NO foto de perfil)
-- Idempotente: crea la tabla solo si no existe

CREATE TABLE IF NOT EXISTS archivos_operadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id uuid NOT NULL,
  pathname text NOT NULL,
  url_blob text,
  nombre_archivo text,
  tamano_bytes bigint,
  tipo_mime text,
  metadata jsonb,
  fecha_subida timestamptz DEFAULT now(),
  subido_por text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_archivos_operadores_operador_id ON archivos_operadores (operador_id);
CREATE INDEX IF NOT EXISTS idx_archivos_operadores_activo ON archivos_operadores (activo);
CREATE UNIQUE INDEX IF NOT EXISTS uq_archivos_operadores_pathname ON archivos_operadores (pathname);

-- (Opcional) Migración segura desde documentos_operadores
-- Si deseas migrar datos legacy, descomenta y ajusta la condición según convenga.
-- INSERT INTO archivos_operadores (operador_id, pathname, url_blob, nombre_archivo, tamano_bytes, tipo_mime, metadata, fecha_subida, subido_por, activo, created_at)
-- SELECT operador_id, pathname, url_blob, nombre_archivo, tamano_bytes, tipo_mime, metadata, fecha_subida, subido_por, activo, created_at
-- FROM documentos_operadores
-- WHERE tipo_documento != 'fotografia_operador' AND pathname IS NOT NULL;

-- Nota: revisar duplicados antes de ejecutar la migración automática en producción.
