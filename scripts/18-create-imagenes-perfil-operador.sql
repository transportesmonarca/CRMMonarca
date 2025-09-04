-- 18-create-imagenes-perfil-operador.sql
-- Crea la tabla para almacenar la foto de perfil del operador y migración básica desde documentos_operadores

BEGIN;

-- Tabla principal
CREATE TABLE IF NOT EXISTS imagenes_perfil_operador (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  operador_id uuid NOT NULL REFERENCES operadores(id) ON DELETE CASCADE,
  pathname text NOT NULL,
  url_blob text,
  activo boolean NOT NULL DEFAULT true,
  metadata jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para lectura por operador
CREATE INDEX IF NOT EXISTS idx_imagen_perfil_operador_operador_id ON imagenes_perfil_operador(operador_id);

-- Único por operador cuando está activo (solo una foto activa por operador)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'ux_imagen_perfil_operador_activa'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX ux_imagen_perfil_operador_activa ON imagenes_perfil_operador (operador_id) WHERE activo = true';
  END IF;
END$$;

-- Migración básica: copiar fotografías de documentos_operadores si existen
-- Esta inserción es idempotente si se ejecuta una sola vez; revisa antes de ejecutar en producción.
INSERT INTO imagenes_perfil_operador (operador_id, pathname, url_blob, activo, created_at)
SELECT operador_id, COALESCE(pathname, pathname_archivo, url_blob), COALESCE(url_blob, url_archivo), true, now()
FROM documentos_operadores
WHERE tipo_documento = 'fotografia_operador'
  AND (pathname IS NOT NULL OR pathname_archivo IS NOT NULL OR url_blob IS NOT NULL)
ON CONFLICT DO NOTHING;

COMMIT;
