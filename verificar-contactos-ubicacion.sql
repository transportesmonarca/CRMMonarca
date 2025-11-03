-- 🔍 CONSULTAS PARA VERIFICAR DÓNDE ESTÁN GUARDADOS LOS CONTACTOS

-- 1️⃣ VERIFICAR EN LA COLUMNA JSON (ESTRATEGIA PRINCIPAL)
-- Esta es donde DEBERÍAN estar guardados los contactos
SELECT 
    id,
    nombre AS cliente_nombre,
    contactos_json,
    jsonb_array_length(contactos_json) AS total_contactos_json,
    created_at
FROM clientes 
WHERE contactos_json IS NOT NULL 
ORDER BY created_at DESC
LIMIT 10;

-- 2️⃣ VERIFICAR EN LA TABLA NORMALIZADA (FALLBACK)  
-- Solo se usan si el JSON falla
SELECT 
    cc.cliente_id,
    c.nombre AS cliente_nombre,
    COUNT(*) AS total_contactos_tabla,
    array_agg(cc.nombre ORDER BY cc.es_principal DESC) AS nombres_contactos
FROM contactos_clientes cc
JOIN clientes c ON c.id = cc.cliente_id
WHERE cc.activo = true
GROUP BY cc.cliente_id, c.nombre
ORDER BY total_contactos_tabla DESC
LIMIT 10;

-- 3️⃣ COMPARAR AMBAS ESTRATEGIAS
-- Ver qué clientes tienen contactos en JSON vs Tabla
SELECT 
    c.id,
    c.nombre,
    CASE 
        WHEN c.contactos_json IS NOT NULL THEN jsonb_array_length(c.contactos_json)
        ELSE 0 
    END AS contactos_en_json,
    COALESCE(tabla_count.total, 0) AS contactos_en_tabla,
    c.created_at
FROM clientes c
LEFT JOIN (
    SELECT cliente_id, COUNT(*) as total
    FROM contactos_clientes 
    WHERE activo = true 
    GROUP BY cliente_id
) tabla_count ON tabla_count.cliente_id = c.id
WHERE c.contactos_json IS NOT NULL 
   OR tabla_count.total > 0
ORDER BY c.created_at DESC;

-- 4️⃣ VER UN EJEMPLO COMPLETO DE CONTACTOS JSON
-- (Cambia el LIMIT para ver diferentes clientes)
SELECT 
    nombre AS cliente,
    jsonb_pretty(contactos_json) AS contactos_formateados
FROM clientes 
WHERE contactos_json IS NOT NULL 
LIMIT 1;

-- 5️⃣ BUSCAR CLIENTE MÁS RECIENTE CON CONTACTOS
SELECT 
    id,
    nombre,
    contactos_json,
    created_at
FROM clientes 
WHERE contactos_json IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 1;