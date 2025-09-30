-- Script 112: Agregar columnas para manejo inteligente de flete falso
-- Soluciona el problema donde el precio del operador aparece en cero cuando hay flete falso

-- ====================================
-- AGREGAR NUEVAS COLUMNAS A embarques_financiero
-- ====================================

-- 1. Precio original del tipo de servicio (se mantiene siempre)
ALTER TABLE embarques_financiero 
ADD COLUMN IF NOT EXISTS tipo_servicio_precio DECIMAL(10,2);

-- 2. Nombre del tipo de servicio (texto libre, no depende de ID)
ALTER TABLE embarques_financiero 
ADD COLUMN IF NOT EXISTS tipo_servicio_nombre VARCHAR(255);

-- 3. Precio final que se pagará al operador (normal o flete falso)
ALTER TABLE embarques_financiero 
ADD COLUMN IF NOT EXISTS precio_operador_final DECIMAL(10,2);

-- ====================================
-- COMENTARIOS EXPLICATIVOS
-- ====================================

COMMENT ON COLUMN embarques_financiero.tipo_servicio_precio IS 'Precio original del tipo de servicio, se mantiene para historial';
COMMENT ON COLUMN embarques_financiero.tipo_servicio_nombre IS 'Nombre del tipo de servicio, independiente del ID para mayor flexibilidad';
COMMENT ON COLUMN embarques_financiero.precio_operador_final IS 'Precio final a pagar al operador (puede ser precio normal o flete falso)';

-- ====================================
-- ÍNDICE PARA OPTIMIZACIÓN
-- ====================================

CREATE INDEX IF NOT EXISTS idx_embarques_financiero_precio_final 
ON embarques_financiero(precio_operador_final, flete_falso);

-- ====================================
-- MENSAJE DE CONFIRMACIÓN
-- ====================================

DO $$
BEGIN
    RAISE NOTICE '✅ COLUMNAS AGREGADAS EXITOSAMENTE';
    RAISE NOTICE '🔧 tipo_servicio_precio: Precio original del tipo servicio';
    RAISE NOTICE '🔧 tipo_servicio_nombre: Nombre del tipo servicio';
    RAISE NOTICE '🔧 precio_operador_final: Precio final para el operador';
    RAISE NOTICE '💡 Ahora el flete falso no afectará la visualización de precios';
END $$;