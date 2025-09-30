-- 🔧 Script SQL para agregar columnas de fecha faltantes
-- Ejecutar en Supabase SQL Editor para habilitar persistencia completa de estados

-- 1. Agregar columnas a tabla embarques (legacy)
ALTER TABLE embarques 
ADD COLUMN IF NOT EXISTS fecha_completado TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fecha_finalizacion TIMESTAMPTZ;

-- 2. Agregar columnas a tabla embarques_nuevo (normalizada)  
ALTER TABLE embarques_nuevo 
ADD COLUMN IF NOT EXISTS fecha_completado TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fecha_finalizacion TIMESTAMPTZ;

-- 3. Agregar columnas a tabla embarques_estado (si no existen)
ALTER TABLE embarques_estado 
ADD COLUMN IF NOT EXISTS fecha_completado TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fecha_finalizacion TIMESTAMPTZ;

-- 4. Comentarios para documentar el propósito
COMMENT ON COLUMN embarques.fecha_completado IS 'Fecha cuando se marcó como listo-para-asignar';
COMMENT ON COLUMN embarques.fecha_cancelacion IS 'Fecha cuando se canceló el embarque';
COMMENT ON COLUMN embarques.fecha_finalizacion IS 'Fecha cuando se finalizó el embarque';

COMMENT ON COLUMN embarques_nuevo.fecha_completado IS 'Fecha cuando se marcó como listo-para-asignar';
COMMENT ON COLUMN embarques_nuevo.fecha_cancelacion IS 'Fecha cuando se canceló el embarque'; 
COMMENT ON COLUMN embarques_nuevo.fecha_finalizacion IS 'Fecha cuando se finalizó el embarque';

COMMENT ON COLUMN embarques_estado.fecha_completado IS 'Fecha cuando se marcó como listo-para-asignar';
COMMENT ON COLUMN embarques_estado.fecha_cancelacion IS 'Fecha cuando se canceló el embarque';
COMMENT ON COLUMN embarques_estado.fecha_finalizacion IS 'Fecha cuando se finalizó el embarque';

-- Verificar que las columnas se agregaron correctamente
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('embarques', 'embarques_nuevo', 'embarques_estado')
  AND column_name IN ('fecha_completado', 'fecha_cancelacion', 'fecha_finalizacion')
ORDER BY table_name, column_name;