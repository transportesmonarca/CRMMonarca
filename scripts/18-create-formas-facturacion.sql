-- Crear tabla formas_facturacion
-- Ejecutar en la BD de Supabase (psql o la consola SQL)
CREATE TABLE IF NOT EXISTS public.formas_facturacion (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text,
  fecha_creacion timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índice por nombre para búsquedas/ordenamiento
CREATE INDEX IF NOT EXISTS idx_formas_facturacion_nombre ON public.formas_facturacion (lower(nombre));
