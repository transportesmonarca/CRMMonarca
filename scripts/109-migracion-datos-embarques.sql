-- Script 109: Migración de datos de embarques a tablas normalizadas
-- Este script copia todos los datos existentes sin pérdida de información

BEGIN;

-- ====================================
-- MIGRACIÓN DE DATOS
-- ====================================

-- 1. Migrar datos a la tabla principal embarques_nuevo
INSERT INTO embarques_nuevo (
    id, folio, cliente_id, tipo_servicio_id, operador_id, 
    camion_id, remolque_id, contenido, peso, load_number, 
    estado, modificado, created_at, updated_at
)
SELECT 
    id,
    COALESCE(folio, 'TEMP-' || id::text) as folio,
    cliente_id,
    tipo_servicio_id,
    operador_id,
    camion_id,
    remolque_id,
    contenido,
    peso,
    load_number,
    COALESCE(estado, 'pendiente') as estado,
    COALESCE(modificado, false) as modificado,
    COALESCE(fecha_creacion, now()) as created_at,
    COALESCE(updated_at, now()) as updated_at
FROM embarques;

-- 2. Migrar datos a embarques_ubicaciones
INSERT INTO embarques_ubicaciones (
    embarque_id, origen, lugar_recolecta, direccion_recolecta, 
    fecha_recolecta, hora_recolecta, tiempo_recolecta,
    destino, direccion_entrega, fecha_entrega, hora_entrega, 
    tiempo_entrega, aduana_cruce, patente_agente_aduanal
)
SELECT 
    id as embarque_id,
    origen,
    lugar_recolecta,
    direccion_recolecta,
    fecha_recolecta,
    hora_recolecta,
    tiempo_recolecta,
    destino,
    direccion_entrega,
    fecha_entrega,
    hora_entrega,
    tiempo_entrega,
    aduana_cruce,
    patente_agente_aduanal
FROM embarques
WHERE id IS NOT NULL;

-- 3. Migrar datos a embarques_financiero
INSERT INTO embarques_financiero (
    embarque_id, precio_flete, moneda_flete, quickpaid_enabled,
    quickpaid_percent, quickpaid_descuento, precio_quickpaid,
    pago_operador, flete_falso, pago_operador_flete_falso,
    ultima_justificacion_precio, ultima_actualizacion_precio_por,
    ultima_actualizacion_precio_fecha, ultima_modificacion_precio_por,
    fecha_ultima_modificacion_precio
)
SELECT 
    id as embarque_id,
    precio_flete,
    COALESCE(moneda_flete, 'MXN') as moneda_flete,
    COALESCE(quickpaid_enabled, false) as quickpaid_enabled,
    quickpaid_percent,
    quickpaid_descuento,
    precio_quickpaid,
    pago_operador,
    COALESCE(flete_falso, false) as flete_falso,
    pago_operador_flete_falso,
    ultima_justificacion_precio,
    ultima_actualizacion_precio_por,
    ultima_actualizacion_precio_fecha,
    ultima_modificacion_precio_por,
    fecha_ultima_modificacion_precio
FROM embarques
WHERE id IS NOT NULL;

-- 4. Migrar datos a embarques_estado
INSERT INTO embarques_estado (
    embarque_id, estado_facturacion, pagado, fecha_creacion,
    fecha_finalizacion, fecha_pago, fecha_archivado, fecha_cancelacion,
    usuario_archivo, motivo_archivo, observaciones_archivo,
    cancelado_por, motivo_cancelacion
)
SELECT 
    id as embarque_id,
    estado_facturacion,
    COALESCE(pagado, false) as pagado,
    COALESCE(fecha_creacion, now()) as fecha_creacion,
    fecha_finalizacion,
    fecha_pago,
    fecha_archivado,
    fecha_cancelacion,
    usuario_archivo,
    motivo_archivo,
    observaciones_archivo,
    cancelado_por,
    motivo_cancelacion
FROM embarques
WHERE id IS NOT NULL;

-- 5. Migrar datos a embarques_documentos
INSERT INTO embarques_documentos (
    embarque_id, carta_porte, folio_factura_1, folio_factura_2,
    folio_factura_3, folio_factura_4, fecha_envio_cliente_1,
    fecha_envio_cliente_2, fecha_envio_cliente_3, fecha_envio_cliente_4,
    fecha_pago_1, fecha_pago_2, fecha_pago_3, fecha_pago_4,
    referencia_pago, referencia_pago_1, referencia_pago_2,
    referencia_pago_3, referencia_pago_4, cantidad_final_facturada,
    reporte_cliente_url
)
SELECT 
    id as embarque_id,
    carta_porte,
    folio_factura_1,
    folio_factura_2,
    folio_factura_3,
    folio_factura_4,
    fecha_envio_cliente_1,
    fecha_envio_cliente_2,
    fecha_envio_cliente_3,
    fecha_envio_cliente_4,
    fecha_pago_1,
    fecha_pago_2,
    fecha_pago_3,
    fecha_pago_4,
    referencia_pago,
    referencia_pago_1,
    referencia_pago_2,
    referencia_pago_3,
    referencia_pago_4,
    cantidad_final_facturada,
    reporte_cliente_url
FROM embarques
WHERE id IS NOT NULL;

-- 6. Migrar datos a embarques_adicional
INSERT INTO embarques_adicional (
    embarque_id, observaciones, observaciones_facturacion,
    dueno_mercancia, representante_cliente, info_representante,
    remolque_manual, remolque_numero_economico, remolque_placa,
    tipo_servicio_slug
)
SELECT 
    id as embarque_id,
    observaciones,
    observaciones_facturacion,
    dueno_mercancia,
    representante_cliente,
    info_representante,
    COALESCE(remolque_manual, false) as remolque_manual,
    remolque_numero_economico,
    remolque_placa,
    tipo_servicio_slug
FROM embarques
WHERE id IS NOT NULL;

-- ====================================
-- VERIFICACIÓN DE MIGRACIÓN
-- ====================================

-- Verificar que se migraron todos los registros
DO $$
DECLARE
    total_original INTEGER;
    total_nuevo INTEGER;
    total_ubicaciones INTEGER;
    total_financiero INTEGER;
    total_estado INTEGER;
    total_documentos INTEGER;
    total_adicional INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_original FROM embarques;
    SELECT COUNT(*) INTO total_nuevo FROM embarques_nuevo;
    SELECT COUNT(*) INTO total_ubicaciones FROM embarques_ubicaciones;
    SELECT COUNT(*) INTO total_financiero FROM embarques_financiero;
    SELECT COUNT(*) INTO total_estado FROM embarques_estado;
    SELECT COUNT(*) INTO total_documentos FROM embarques_documentos;
    SELECT COUNT(*) INTO total_adicional FROM embarques_adicional;
    
    RAISE NOTICE '📊 VERIFICACIÓN DE MIGRACIÓN:';
    RAISE NOTICE 'Registros originales: %', total_original;
    RAISE NOTICE 'Embarques nuevo: %', total_nuevo;
    RAISE NOTICE 'Ubicaciones: %', total_ubicaciones;
    RAISE NOTICE 'Financiero: %', total_financiero;
    RAISE NOTICE 'Estado: %', total_estado;
    RAISE NOTICE 'Documentos: %', total_documentos;
    RAISE NOTICE 'Adicional: %', total_adicional;
    
    IF total_original = total_nuevo AND 
       total_original = total_ubicaciones AND
       total_original = total_financiero AND
       total_original = total_estado AND
       total_original = total_documentos AND
       total_original = total_adicional THEN
        RAISE NOTICE '✅ MIGRACIÓN EXITOSA - Todos los registros copiados';
    ELSE
        RAISE EXCEPTION '❌ ERROR EN MIGRACIÓN - Registros no coinciden';
    END IF;
END $$;

-- ====================================
-- CREAR VISTA UNIFICADA
-- ====================================

CREATE OR REPLACE VIEW embarques_completa AS
SELECT 
    -- Campos principales
    e.id,
    e.folio,
    e.cliente_id,
    e.tipo_servicio_id,
    e.operador_id,
    e.camion_id,
    e.remolque_id,
    e.contenido,
    e.peso,
    e.load_number,
    e.estado,
    e.modificado,
    e.created_at,
    e.updated_at,
    
    -- Ubicaciones
    u.origen,
    u.lugar_recolecta,
    u.direccion_recolecta,
    u.fecha_recolecta,
    u.hora_recolecta,
    u.tiempo_recolecta,
    u.destino,
    u.direccion_entrega,
    u.fecha_entrega,
    u.hora_entrega,
    u.tiempo_entrega,
    u.aduana_cruce,
    u.patente_agente_aduanal,
    
    -- Financiero
    f.precio_flete,
    f.moneda_flete,
    f.quickpaid_enabled,
    f.quickpaid_percent,
    f.quickpaid_descuento,
    f.precio_quickpaid,
    f.pago_operador,
    f.flete_falso,
    f.pago_operador_flete_falso,
    f.ultima_justificacion_precio,
    f.ultima_actualizacion_precio_por,
    f.ultima_actualizacion_precio_fecha,
    f.ultima_modificacion_precio_por,
    f.fecha_ultima_modificacion_precio,
    
    -- Estado
    es.estado_facturacion,
    es.pagado,
    es.fecha_creacion,
    es.fecha_finalizacion,
    es.fecha_pago,
    es.fecha_archivado,
    es.fecha_cancelacion,
    es.usuario_archivo,
    es.motivo_archivo,
    es.observaciones_archivo,
    es.cancelado_por,
    es.motivo_cancelacion,
    
    -- Documentos
    d.carta_porte,
    d.folio_factura_1,
    d.folio_factura_2,
    d.folio_factura_3,
    d.folio_factura_4,
    d.fecha_envio_cliente_1,
    d.fecha_envio_cliente_2,
    d.fecha_envio_cliente_3,
    d.fecha_envio_cliente_4,
    d.fecha_pago_1,
    d.fecha_pago_2,
    d.fecha_pago_3,
    d.fecha_pago_4,
    d.referencia_pago,
    d.referencia_pago_1,
    d.referencia_pago_2,
    d.referencia_pago_3,
    d.referencia_pago_4,
    d.cantidad_final_facturada,
    d.reporte_cliente_url,
    
    -- Adicional
    a.observaciones,
    a.observaciones_facturacion,
    a.dueno_mercancia,
    a.representante_cliente,
    a.info_representante,
    a.remolque_manual,
    a.remolque_numero_economico,
    a.remolque_placa,
    a.tipo_servicio_slug

FROM embarques_nuevo e
LEFT JOIN embarques_ubicaciones u ON e.id = u.embarque_id
LEFT JOIN embarques_financiero f ON e.id = f.embarque_id
LEFT JOIN embarques_estado es ON e.id = es.embarque_id
LEFT JOIN embarques_documentos d ON e.id = d.embarque_id
LEFT JOIN embarques_adicional a ON e.id = a.embarque_id;

-- ====================================
-- PERMISOS Y COMENTARIOS
-- ====================================

COMMENT ON VIEW embarques_completa IS 'Vista unificada de todas las tablas normalizadas de embarques - mantiene compatibilidad con código existente';

-- Mensaje de finalización
DO $$
BEGIN
    RAISE NOTICE '🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '📋 Se crearon 6 tablas normalizadas';
    RAISE NOTICE '📊 Se creó la vista embarques_completa';
    RAISE NOTICE '⚡ El sistema está listo para usar las tablas normalizadas';
END $$;

COMMIT;