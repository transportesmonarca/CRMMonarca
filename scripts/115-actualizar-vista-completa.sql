-- Script 115: Actualizar vista embarques_completa con nuevas columnas
-- Incluye las nuevas columnas en la vista para compatibilidad

-- ====================================
-- RECREAR VISTA EMBARQUES_COMPLETA
-- ====================================
DROP VIEW IF EXISTS embarques_completa;

CREATE VIEW embarques_completa AS
SELECT 
    -- Datos principales del embarque
    e.id,
    e.folio,
    e.cliente_id,
    c.nombre AS cliente_nombre,
    e.tipo_servicio_id,
    ts.nombre AS tipo_servicio_nombre_original, -- Del tipo servicio original
    e.operador_id,
    CONCAT(op.nombre, ' ', op.apellidos) AS operador_nombre,
    e.camion_id,
    cam.placas AS camion_placas,
    e.remolque_id,
    rem.placas AS remolque_placas,
    e.contenido,
    e.peso,
    e.load_number,
    e.estado,
    e.modificado,
    e.created_at,
    e.updated_at,
    
    -- Datos de ubicaciones
    u.origen,
    u.destino,
    u.fecha_recolecta,
    u.fecha_entrega,
    
    -- Datos financieros ACTUALIZADOS
    f.precio_flete,
    f.pago_operador,
    f.flete_falso,
    f.tipo_servicio_precio,          -- NUEVA: Precio original del tipo servicio
    f.tipo_servicio_nombre,          -- NUEVA: Nombre del tipo servicio (independiente)
    f.precio_operador_final,         -- NUEVA: Precio final a pagar (nunca será $0)
    
    -- Datos de estado
    est.estado_facturacion,
    est.pagado,
    est.fecha_creacion,
    est.fecha_finalizacion,
    
    -- Datos de documentos
    d.carta_porte,
    
    -- Datos adicionales
    ad.observaciones

FROM embarques_nuevo e
LEFT JOIN clientes c ON e.cliente_id = c.id
LEFT JOIN tipos_servicio ts ON e.tipo_servicio_id = ts.id
LEFT JOIN operadores op ON e.operador_id = op.id
LEFT JOIN camiones cam ON e.camion_id = cam.id
LEFT JOIN remolques rem ON e.remolque_id = rem.id
LEFT JOIN embarques_ubicaciones u ON e.id = u.embarque_id
LEFT JOIN embarques_financiero f ON e.id = f.embarque_id
LEFT JOIN embarques_estado est ON e.id = est.embarque_id
LEFT JOIN embarques_documentos d ON e.id = d.embarque_id
LEFT JOIN embarques_adicional ad ON e.id = ad.embarque_id;

-- ====================================
-- COMENTARIOS EXPLICATIVOS
-- ====================================
COMMENT ON VIEW embarques_completa IS 'Vista completa de embarques con soporte para flete falso inteligente - Versión 2.0';

-- ====================================
-- PERMISOS PARA LA VISTA
-- ====================================
-- Aquí puedes agregar permisos específicos si es necesario
-- GRANT SELECT ON embarques_completa TO rol_usuarios;

-- ====================================
-- MENSAJE DE CONFIRMACIÓN
-- ====================================
DO $$
BEGIN
    RAISE NOTICE '✅ VISTA EMBARQUES_COMPLETA ACTUALIZADA';
    RAISE NOTICE '🔧 Incluye nuevas columnas:';
    RAISE NOTICE '   - tipo_servicio_precio';
    RAISE NOTICE '   - tipo_servicio_nombre';
    RAISE NOTICE '   - precio_operador_final';
    RAISE NOTICE '💡 Lista para usar en facturación/cobranza';
END $$;