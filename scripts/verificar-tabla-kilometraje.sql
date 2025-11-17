-- Script para verificar si existe la tabla registros_kilometraje
-- y mostrar algunos registros de ejemplo

-- Verificar si la tabla existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE  table_schema = 'public'
   AND    table_name   = 'registros_kilometraje'
) as tabla_existe;

-- Mostrar estructura de la tabla si existe
\d registros_kilometraje;

-- Mostrar algunos registros de ejemplo
SELECT 
    id,
    camion_id,
    fecha_viaje,
    fecha_registro,
    kilometraje_agregado,
    tramo_recorrido,
    created_at
FROM registros_kilometraje 
ORDER BY created_at DESC 
LIMIT 5;

-- Contar total de registros
SELECT COUNT(*) as total_registros FROM registros_kilometraje;

-- Mostrar registros por camión
SELECT 
    camion_id,
    COUNT(*) as registros_por_camion
FROM registros_kilometraje 
GROUP BY camion_id
ORDER BY registros_por_camion DESC
LIMIT 10;