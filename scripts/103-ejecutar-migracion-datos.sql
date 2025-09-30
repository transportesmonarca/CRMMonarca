-- =================================================================
-- PASO 4: EJECUTAR MIGRACIÓN DE DATOS
-- Ejecutar DESPUÉS de validar que todas las tablas se crearon correctamente
-- =================================================================

-- 🚨 IMPORTANTE: Ejecutar esta función para migrar todos los datos
-- de la tabla embarques a las nuevas tablas normalizadas

SELECT * FROM migrar_datos_embarques_normalizados();

-- La función retornará un resumen con:
-- - total_migrados: Total de embarques procesados
-- - total_logistica: Registros en embarques_logistica  
-- - total_servicios: Registros en embarques_servicios
-- - total_facturacion: Registros en embarques_facturacion
-- - total_envios: Registros en embarques_envios_cliente
-- - total_pagos: Registros en embarques_pagos
-- - total_observaciones: Registros en embarques_observaciones
-- - total_representantes: Registros en embarques_representantes

-- ⏱️  Esta operación puede tomar varios minutos dependiendo del tamaño de tu tabla embarques
-- 💡 La función mostrará progreso cada 100 registros procesados