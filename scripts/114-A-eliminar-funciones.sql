-- Script 114-A: Eliminar funciones antes de recrearlas
-- Necesario porque cambiamos la estructura de retorno

-- Eliminar funciones que vamos a recrear con nueva estructura
DROP FUNCTION IF EXISTS obtener_embarque_completo(uuid);
DROP FUNCTION IF EXISTS obtener_embarques_operador(uuid);
DROP FUNCTION IF EXISTS calcular_pago_operador_normalizado(uuid);

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ FUNCIONES ELIMINADAS PARA RECREACIÓN';
    RAISE NOTICE '🔧 Listo para ejecutar script 114 completo';
END $$;