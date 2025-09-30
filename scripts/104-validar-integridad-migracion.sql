-- =================================================================
-- PASO 5: VALIDAR INTEGRIDAD DE DATOS MIGRADOS
-- Ejecutar DESPUÉS de la migración para verificar que todo está correcto
-- =================================================================

-- 1. Ejecutar función de validación automática
SELECT * FROM validar_migracion_embarques();

-- 2. Verificar conteos detallados por tabla
SELECT 
    'embarques_original' as tabla,
    COUNT(*) as registros,
    'Tabla original' as descripcion
FROM embarques
UNION ALL
SELECT 
    'embarques_core' as tabla,
    COUNT(*) as registros,
    'Datos esenciales migrados' as descripcion
FROM embarques_core
UNION ALL
SELECT 
    'embarques_logistica' as tabla,
    COUNT(*) as registros,
    'Datos logísticos migrados' as descripcion
FROM embarques_logistica
UNION ALL
SELECT 
    'embarques_servicios' as tabla,
    COUNT(*) as registros,
    'Datos de servicios migrados' as descripcion
FROM embarques_servicios
UNION ALL
SELECT 
    'embarques_facturacion' as tabla,
    COUNT(*) as registros,
    'Datos de facturación migrados' as descripcion
FROM embarques_facturacion
UNION ALL
SELECT 
    'embarques_envios_cliente' as tabla,
    COUNT(*) as registros,
    'Envíos al cliente (múltiples por embarque)' as descripcion
FROM embarques_envios_cliente
UNION ALL
SELECT 
    'embarques_pagos' as tabla,
    COUNT(*) as registros,
    'Pagos recibidos (múltiples por embarque)' as descripcion
FROM embarques_pagos
UNION ALL
SELECT 
    'embarques_observaciones' as tabla,
    COUNT(*) as registros,
    'Observaciones con texto' as descripcion
FROM embarques_observaciones
UNION ALL
SELECT 
    'embarques_representantes' as tabla,
    COUNT(*) as registros,
    'Representantes de clientes' as descripcion
FROM embarques_representantes;

-- 3. Verificar integridad de datos críticos
SELECT 
    'Folios únicos' as verificacion,
    COUNT(DISTINCT folio) as embarques_original,
    (SELECT COUNT(DISTINCT folio) FROM embarques_core) as embarques_core,
    CASE 
        WHEN COUNT(DISTINCT folio) = (SELECT COUNT(DISTINCT folio) FROM embarques_core) 
        THEN '✅ OK' 
        ELSE '❌ ERROR' 
    END as estado
FROM embarques
UNION ALL
SELECT 
    'Embarques con flete falso' as verificacion,
    COUNT(*) as embarques_original,
    (SELECT COUNT(*) FROM embarques_servicios WHERE flete_falso = true) as embarques_core,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM embarques_servicios WHERE flete_falso = true) 
        THEN '✅ OK' 
        ELSE '❌ ERROR' 
    END as estado
FROM embarques WHERE flete_falso = true
UNION ALL
SELECT 
    'Embarques con pago operador' as verificacion,
    COUNT(*) as embarques_original,
    (SELECT COUNT(*) FROM embarques_servicios WHERE pago_operador IS NOT NULL AND pago_operador > 0) as embarques_core,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM embarques_servicios WHERE pago_operador IS NOT NULL AND pago_operador > 0) 
        THEN '✅ OK' 
        ELSE '⚠️  REVISAR' 
    END as estado
FROM embarques WHERE pago_operador IS NOT NULL AND pago_operador > 0;

-- 4. Verificar algunos registros específicos (muestreo)
SELECT 
    'TIM-2509-028' as folio_prueba,
    e_orig.flete_falso as flete_falso_original,
    e_orig.pago_operador as pago_operador_original,
    es.flete_falso as flete_falso_migrado,
    es.pago_operador as pago_operador_migrado,
    CASE 
        WHEN e_orig.flete_falso = es.flete_falso 
             AND COALESCE(e_orig.pago_operador, 0) = COALESCE(es.pago_operador, 0)
        THEN '✅ OK'
        ELSE '❌ ERROR'
    END as estado
FROM embarques e_orig
JOIN embarques_core ec ON e_orig.id = ec.id
JOIN embarques_servicios es ON ec.id = es.embarque_id
WHERE e_orig.folio = 'TIM-2509-028'
UNION ALL
SELECT 
    'TIM-2509-030' as folio_prueba,
    e_orig.flete_falso as flete_falso_original,
    e_orig.pago_operador as pago_operador_original,
    es.flete_falso as flete_falso_migrado,
    es.pago_operador as pago_operador_migrado,
    CASE 
        WHEN e_orig.flete_falso = es.flete_falso 
             AND COALESCE(e_orig.pago_operador, 0) = COALESCE(es.pago_operador, 0)
        THEN '✅ OK'
        ELSE '❌ ERROR'
    END as estado
FROM embarques e_orig
JOIN embarques_core ec ON e_orig.id = ec.id
JOIN embarques_servicios es ON ec.id = es.embarque_id
WHERE e_orig.folio = 'TIM-2509-030';

-- 5. Verificar expansión de campos múltiples (envíos y pagos)
-- Ejemplo: Un embarque con 3 pagos debe generar 3 registros en embarques_pagos
WITH ejemplo_pagos AS (
    SELECT 
        folio,
        CASE WHEN fecha_pago_1 IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN fecha_pago_2 IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN fecha_pago_3 IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN fecha_pago_4 IS NOT NULL THEN 1 ELSE 0 END as pagos_esperados
    FROM embarques 
    WHERE fecha_pago_1 IS NOT NULL OR fecha_pago_2 IS NOT NULL 
       OR fecha_pago_3 IS NOT NULL OR fecha_pago_4 IS NOT NULL
    LIMIT 5
)
SELECT 
    ep.folio,
    ep.pagos_esperados,
    COUNT(epg.id) as pagos_migrados,
    CASE 
        WHEN ep.pagos_esperados = COUNT(epg.id) THEN '✅ OK'
        ELSE '❌ ERROR'
    END as estado
FROM ejemplo_pagos ep
JOIN embarques_core ec ON ep.folio = ec.folio
LEFT JOIN embarques_pagos epg ON ec.id = epg.embarque_id
GROUP BY ep.folio, ep.pagos_esperados
ORDER BY ep.folio;

-- 6. Resumen final
SELECT 
    '🎯 VALIDACIÓN COMPLETADA' as titulo,
    '' as mensaje
UNION ALL
SELECT 
    '✅ Si todos los estados son OK,' as titulo,
    'puedes proceder a crear la vista de compatibilidad' as mensaje
UNION ALL
SELECT 
    '❌ Si hay errores,' as titulo,
    'revisa los datos y considera rollback' as mensaje
UNION ALL
SELECT 
    '⚠️  Si hay diferencias menores,' as titulo,
    'investiga antes de continuar' as mensaje;

-- ✅ Si todas las validaciones muestran OK, procede con el siguiente script:
-- 104-crear-vista-compatibilidad.sql