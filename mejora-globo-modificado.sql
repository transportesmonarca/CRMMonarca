-- =============================================
-- MEJORA GLOBO "MODIFICADO": Distinguir modificaciones reales
-- =============================================
-- Fix: El globo "modificado" solo debe aparecer cuando se usa "Editar Embarque",
--      NO cuando se usa "Completar y Enviar"
-- Fecha: 25/09/2025

-- 1. AGREGAR COLUMNA PARA DISTINGUIR TIPOS DE MODIFICACIÓN
ALTER TABLE embarque_modificaciones ADD COLUMN tipo_modificacion TEXT;

-- 2. COMENTAR LA COLUMNA PARA DOCUMENTAR SU USO
COMMENT ON COLUMN embarque_modificaciones.tipo_modificacion IS 
'Tipo de modificación: EDITAR_EMBARQUE (desde modal) vs COMPLETAR_ENVIAR (cambio de estado)';

-- 3. ACTUALIZAR REGISTROS EXISTENTES
-- Todos los registros existentes son modificaciones reales (desde modal "Editar Embarque")
UPDATE embarque_modificaciones 
SET tipo_modificacion = 'EDITAR_EMBARQUE'
WHERE tipo_modificacion IS NULL;

-- 4. VERIFICACIÓN DE LA ESTRUCTURA ACTUALIZADA
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'embarque_modificaciones' 
  AND column_name = 'tipo_modificacion';

-- 5. VERIFICAR REGISTROS ACTUALIZADOS
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN tipo_modificacion = 'EDITAR_EMBARQUE' THEN 1 END) as editar_embarque,
    COUNT(CASE WHEN tipo_modificacion IS NULL THEN 1 END) as sin_tipo
FROM embarque_modificaciones;

-- ✅ RESULTADO ESPERADO:
-- - Campo tipo_modificacion agregado
-- - Registros existentes marcados como 'EDITAR_EMBARQUE'
-- - Nuevos registros del frontend usarán este campo para distinguir tipos
-- - Globo "modificado" solo aparecerá para modificaciones reales