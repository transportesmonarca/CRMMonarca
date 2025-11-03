-- 🔍 VERIFICAR ESTRUCTURA REAL DE TABLA contactos_clientes

-- Ver todas las columnas que realmente existen
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'contactos_clientes' 
ORDER BY ordinal_position;

-- Ver algunos registros de ejemplo para entender la estructura
SELECT *
FROM contactos_clientes
WHERE activo = true
LIMIT 5;