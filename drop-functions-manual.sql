-- Script para eliminar funciones antiguas manualmente
-- Ejecuta este código en el SQL Editor de Supabase

-- Eliminar funciones antiguas que pueden tener conflictos de parámetros
DROP FUNCTION IF EXISTS obtener_embarque_completo(uuid);
DROP FUNCTION IF EXISTS actualizar_pago_operador(uuid, numeric);
DROP FUNCTION IF EXISTS actualizar_estado_embarque(uuid, varchar, timestamp);
DROP FUNCTION IF EXISTS calcular_pago_operador_normalizado(uuid);
DROP FUNCTION IF EXISTS insertar_embarque_completo(varchar, uuid, uuid, text, varchar, varchar, numeric);
DROP FUNCTION IF EXISTS obtener_embarques_operador(uuid);

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ FUNCIONES ANTIGUAS ELIMINADAS';
    RAISE NOTICE '🔧 Ahora puedes ejecutar el script 110 sin conflictos';
END $$;