-- ========================================
-- SCRIPT PARA VERIFICAR DOCUMENTOS DE REMOLQUES
-- EJECUTAR EN SUPABASE SQL EDITOR PARA DEBUG
-- ========================================

-- 1. Verificar si existen remolques
SELECT 
  'REMOLQUES' as tipo,
  COUNT(*) as cantidad,
  'Estos son los remolques disponibles' as descripcion
FROM remolques;

-- 2. Verificar si existen documentos de remolques
SELECT 
  'DOCUMENTOS_REMOLQUES' as tipo,
  COUNT(*) as cantidad,
  'Estos son los documentos subidos' as descripcion
FROM documentos_remolques;

-- 3. Ver documentos por remolque (si existen)
SELECT 
  r.numero_economico,
  r.id as remolque_id,
  COUNT(d.id) as documentos_count
FROM remolques r
LEFT JOIN documentos_remolques d ON r.id = d.remolque_id
GROUP BY r.id, r.numero_economico
ORDER BY documentos_count DESC;

-- 4. Ver detalles de documentos (si existen)
SELECT 
  d.id,
  d.remolque_id,
  d.nombre_archivo,
  d.tipo_documento,
  d.created_at,
  r.numero_economico
FROM documentos_remolques d
JOIN remolques r ON d.remolque_id = r.id
WHERE d.activo = true
ORDER BY d.created_at DESC
LIMIT 10;