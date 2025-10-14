-- Migración simple para agregar columna operator_number a operadores
-- Ejecutar en el SQL Editor de Supabase

-- 1. Agregar la columna operator_number
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS operator_number TEXT;

-- 2. Crear índice único para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_operadores_operator_number_unique 
ON operadores (operator_number) 
WHERE operator_number IS NOT NULL;

-- 3. Verificar que se creó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'operadores' 
AND column_name = 'operator_number';