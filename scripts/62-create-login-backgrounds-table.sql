-- 62-create-login-backgrounds-table.sql
-- Crea la tabla para almacenar las imágenes de fondo utilizadas en la pantalla de login.
-- Incluye índices y políticas de RLS para permitir lectura pública (anon) y escritura por usuarios autenticados.

BEGIN;

CREATE TABLE IF NOT EXISTS login_backgrounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moment text NOT NULL CHECK (moment IN ('day', 'evening', 'night')),
  url text NOT NULL,
  pathname text NOT NULL,
  uploaded_by text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para acelerar consultas por momento y fecha de creación
CREATE INDEX IF NOT EXISTS idx_login_backgrounds_moment ON login_backgrounds(moment);
CREATE INDEX IF NOT EXISTS idx_login_backgrounds_created_at ON login_backgrounds(created_at DESC);

-- Habilitar RLS para controlar el acceso
ALTER TABLE login_backgrounds ENABLE ROW LEVEL SECURITY;

-- Permitir lectura a cualquier usuario (incluyendo anon) para que la pantalla de login pueda
-- obtener las imágenes sin autenticación.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'login_backgrounds'
      AND policyname = 'Public read login backgrounds'
  ) THEN
    EXECUTE 'CREATE POLICY "Public read login backgrounds" ON login_backgrounds FOR SELECT TO anon, authenticated USING (true)';
  END IF;
END$$;

-- Permitir inserciones a usuarios autenticados. Las cargas desde la aplicación pasan por
-- un endpoint con la clave service-role, pero dejamos la política para futuros usos.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'login_backgrounds'
      AND policyname = 'Authenticated insert login backgrounds'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated insert login backgrounds" ON login_backgrounds FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
END$$;

COMMIT;