-- 🧪 SCRIPT DE PRUEBA: Verificar que los contactos se guardan en contactos_clientes

-- 0️⃣ Verificar estructura de la tabla clientes (para ver qué columnas de fecha tienen)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'clientes' 
ORDER BY ordinal_position;

-- 1️⃣ Verificar estructura de la tabla contactos_clientes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'contactos_clientes' 
ORDER BY ordinal_position;

-- 2️⃣ Ver todos los contactos activos (agrupados por cliente)
SELECT 
    cc.cliente_id,
    c.nombre AS cliente_nombre,
    COUNT(*) AS total_contactos,
    COUNT(CASE WHEN cc.es_principal THEN 1 END) AS contactos_principales,
    array_agg(
        cc.nombre || 
        CASE WHEN cc.es_principal THEN ' (PRINCIPAL)' ELSE '' END
        ORDER BY cc.es_principal DESC, cc.nombre
    ) AS lista_contactos
FROM contactos_clientes cc
JOIN clientes c ON c.id = cc.cliente_id
WHERE cc.activo = true
GROUP BY cc.cliente_id, c.nombre
ORDER BY total_contactos DESC, c.nombre;

-- 3️⃣ Ver contactos de un cliente específico (cambiar el ID)
-- SELECT * FROM contactos_clientes 
-- WHERE cliente_id = 'TU-CLIENTE-ID-AQUI' 
-- AND activo = true 
-- ORDER BY es_principal DESC, nombre;

-- 4️⃣ Ver clientes sin contactos
SELECT c.id, c.nombre, c.fecha_registro
FROM clientes c
LEFT JOIN contactos_clientes cc ON cc.cliente_id = c.id AND cc.activo = true
WHERE cc.cliente_id IS NULL
ORDER BY c.fecha_registro DESC;

-- 5️⃣ Estadísticas generales
SELECT 
    'Clientes totales' as tipo,
    COUNT(*) as cantidad
FROM clientes
UNION ALL
SELECT 
    'Clientes con contactos' as tipo,
    COUNT(DISTINCT cc.cliente_id) as cantidad
FROM contactos_clientes cc
WHERE cc.activo = true
UNION ALL
SELECT 
    'Contactos totales activos' as tipo,
    COUNT(*) as cantidad
FROM contactos_clientes
WHERE activo = true
UNION ALL
SELECT 
    'Contactos principales' as tipo,
    COUNT(*) as cantidad
FROM contactos_clientes
WHERE activo = true AND es_principal = true;