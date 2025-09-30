-- =================================================================
-- PASO 6: CREAR VISTA DE COMPATIBILIDAD
-- Ejecutar DESPUÉS de validar que la migración fue exitosa
-- =================================================================

-- 1. Crear la vista que reemplazará la tabla embarques
-- Esta vista une todas las tablas normalizadas para mantener la misma interfaz
CREATE OR REPLACE VIEW embarques_nueva AS
SELECT 
    -- Core fields (tabla principal)
    ec.id,
    ec.folio,
    ec.cliente_id,
    ec.operador_id,
    ec.camion_id,
    ec.remolque_id,
    ec.origen,
    ec.destino,
    ec.contenido,
    ec.peso,
    ec.estado,
    ec.fecha_creacion,
    ec.updated_at,
    
    -- Logística
    el.lugar_recolecta,
    el.direccion_recolecta,
    el.fecha_recolecta,
    el.hora_recolecta,
    el.tiempo_recolecta,
    el.direccion_entrega,
    el.fecha_entrega,
    el.hora_entrega,
    el.tiempo_entrega,
    el.carta_porte,
    el.load_number,
    el.patente_agente_aduanal,
    el.aduana_cruce,
    el.dueno_mercancia,
    el.remolque_manual,
    el.remolque_numero_economico,
    el.remolque_placa,
    
    -- Servicios
    es.tipo_servicio_id,
    es.precio_flete,
    es.moneda_flete,
    es.moneda_flete as currency, -- Alias para compatibilidad
    es.quickpaid_enabled,
    es.quickpaid_percent,
    es.quickpaid_descuento,
    es.precio_quickpaid,
    es.flete_falso,
    es.modificado,
    es.pago_operador,
    
    -- Facturación
    ef.estado_facturacion,
    ef.fecha_archivado,
    ef.usuario_archivo,
    ef.motivo_archivo,
    ef.observaciones_archivo,
    ef.fecha_cancelacion,
    ef.cancelado_por,
    ef.motivo_cancelacion,
    ef.fecha_finalizacion,
    
    -- Representante
    er.representante_cliente_id::TEXT as representante_cliente,
    er.info_representante,
    
    -- Envíos (campos legacy - compatibilidad con código existente)
    env0.fecha_envio as fecha_envio_cliente,
    env1.fecha_envio as fecha_envio_cliente_1,
    env2.fecha_envio as fecha_envio_cliente_2,
    env3.fecha_envio as fecha_envio_cliente_3,
    env4.fecha_envio as fecha_envio_cliente_4,
    
    -- Pagos (campos legacy - compatibilidad con código existente)
    pag0.referencia_pago as referencia_pago,
    pag1.fecha_pago as fecha_pago_1,
    pag1.referencia_pago as referencia_pago_1,
    pag2.fecha_pago as fecha_pago_2,
    pag2.referencia_pago as referencia_pago_2,
    pag3.fecha_pago as fecha_pago_3,
    pag3.referencia_pago as referencia_pago_3,
    pag4.fecha_pago as fecha_pago_4,
    pag4.referencia_pago as referencia_pago_4,
    
    -- Observaciones (tomar la primera observación general)
    obs.observacion as observaciones

FROM embarques_core ec
LEFT JOIN embarques_logistica el ON ec.id = el.embarque_id
LEFT JOIN embarques_servicios es ON ec.id = es.embarque_id
LEFT JOIN embarques_facturacion ef ON ec.id = ef.embarque_id
LEFT JOIN embarques_representantes er ON ec.id = er.embarque_id

-- Envíos (LEFT JOIN para cada número de envío)
LEFT JOIN embarques_envios_cliente env0 ON ec.id = env0.embarque_id AND env0.numero_envio = 0
LEFT JOIN embarques_envios_cliente env1 ON ec.id = env1.embarque_id AND env1.numero_envio = 1
LEFT JOIN embarques_envios_cliente env2 ON ec.id = env2.embarque_id AND env2.numero_envio = 2
LEFT JOIN embarques_envios_cliente env3 ON ec.id = env3.embarque_id AND env3.numero_envio = 3
LEFT JOIN embarques_envios_cliente env4 ON ec.id = env4.embarque_id AND env4.numero_envio = 4

-- Pagos (LEFT JOIN para cada número de pago)
LEFT JOIN embarques_pagos pag0 ON ec.id = pag0.embarque_id AND pag0.numero_pago = 0
LEFT JOIN embarques_pagos pag1 ON ec.id = pag1.embarque_id AND pag1.numero_pago = 1
LEFT JOIN embarques_pagos pag2 ON ec.id = pag2.embarque_id AND pag2.numero_pago = 2
LEFT JOIN embarques_pagos pag3 ON ec.id = pag3.embarque_id AND pag3.numero_pago = 3
LEFT JOIN embarques_pagos pag4 ON ec.id = pag4.embarque_id AND pag4.numero_pago = 4

-- Observaciones (tomar la primera observación general)
LEFT JOIN LATERAL (
    SELECT observacion 
    FROM embarques_observaciones 
    WHERE embarque_id = ec.id AND tipo_observacion = 'general'
    ORDER BY fecha_creacion ASC 
    LIMIT 1
) obs ON TRUE;

-- 2. Verificar que la vista funciona correctamente
SELECT 
    'Vista creada exitosamente' as resultado,
    COUNT(*) as registros_en_vista
FROM embarques_nueva;

-- 3. Comparar algunos campos críticos entre original y vista
SELECT 
    'Comparación folio TIM-2509-028' as prueba,
    e_orig.flete_falso as original_flete_falso,
    e_nueva.flete_falso as vista_flete_falso,
    e_orig.pago_operador as original_pago_operador,
    e_nueva.pago_operador as vista_pago_operador,
    CASE 
        WHEN e_orig.flete_falso = e_nueva.flete_falso 
             AND COALESCE(e_orig.pago_operador, 0) = COALESCE(e_nueva.pago_operador, 0)
        THEN '✅ OK'
        ELSE '❌ ERROR'
    END as estado
FROM embarques e_orig
JOIN embarques_nueva e_nueva ON e_orig.folio = e_nueva.folio
WHERE e_orig.folio = 'TIM-2509-028';

-- 4. Verificar que la función calcularPagoOperador funciona con la vista
-- (Esto se probará desde la aplicación)

-- 5. Mostrar diferencias en rendimiento (opcional)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT folio, flete_falso, pago_operador 
FROM embarques 
WHERE flete_falso = true 
LIMIT 10;

EXPLAIN (ANALYZE, BUFFERS) 
SELECT folio, flete_falso, pago_operador 
FROM embarques_nueva 
WHERE flete_falso = true 
LIMIT 10;

-- 6. Resumen de la vista creada
SELECT 
    '🎯 VISTA DE COMPATIBILIDAD CREADA' as titulo,
    '' as mensaje
UNION ALL
SELECT 
    '📊 Registros disponibles:' as titulo,
    COUNT(*)::TEXT as mensaje
FROM embarques_nueva
UNION ALL
SELECT 
    '✅ Tu código TypeScript seguirá funcionando' as titulo,
    'sin cambios usando embarques_nueva' as mensaje
UNION ALL
SELECT 
    '🚀 Siguiente paso:' as titulo,
    'Probar funcionalidad existente' as mensaje;

-- ✅ La vista embarques_nueva está lista
-- ⚠️  IMPORTANTE: NO renombrar tablas hasta validar que todo funciona correctamente