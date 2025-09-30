-- VISTA UNIFICADA PARA ARQUITECTURA DESACOPLADA
-- ==============================================
-- Reemplaza la vista embarques_completa actual
-- Unifica datos de todas las tablas desacopladas

-- Eliminar vista anterior si existe
DROP VIEW IF EXISTS embarques_completa_v2;

-- Crear nueva vista unificada
CREATE OR REPLACE VIEW embarques_completa_v2 AS
-- Embarques Creados
SELECT 
  id,
  folio,
  cliente,
  origen,
  destino,
  tipo_material,
  cantidad_material,
  precio_flete,
  observaciones,
  estado,
  NULL as operador_asignado,
  NULL as fecha_asignacion,
  NULL as fecha_inicio_transito,
  NULL as fecha_finalizacion,
  NULL as estado_facturacion,
  NULL as fecha_facturacion,
  NULL as fecha_pago,
  NULL as fecha_archivado,
  NULL as motivo_archivo,
  created_at,
  updated_at,
  'embarques_creados' as tabla_origen
FROM embarques_creados

UNION ALL

-- Embarques Asignados
SELECT 
  id,
  folio,
  cliente,
  origen,
  destino,
  tipo_material,
  cantidad_material,
  precio_flete,
  observaciones,
  estado,
  operador_asignado,
  fecha_asignacion,
  NULL as fecha_inicio_transito,
  NULL as fecha_finalizacion,
  NULL as estado_facturacion,
  NULL as fecha_facturacion,
  NULL as fecha_pago,
  NULL as fecha_archivado,
  NULL as motivo_archivo,
  created_at,
  updated_at,
  'embarques_asignados' as tabla_origen
FROM embarques_asignados

UNION ALL

-- Embarques En Tránsito
SELECT 
  id,
  folio,
  cliente,
  origen,
  destino,
  tipo_material,
  cantidad_material,
  precio_flete,
  NULL as observaciones,
  estado,
  operador_asignado,
  fecha_asignacion,
  fecha_inicio_transito,
  NULL as fecha_finalizacion,
  NULL as estado_facturacion,
  NULL as fecha_facturacion,
  NULL as fecha_pago,
  NULL as fecha_archivado,
  NULL as motivo_archivo,
  created_at,
  updated_at,
  'embarques_en_transito' as tabla_origen
FROM embarques_en_transito

UNION ALL

-- Embarques Finalizados
SELECT 
  id,
  folio,
  cliente,
  origen,
  destino,
  tipo_material,
  cantidad_material,
  precio_flete,
  NULL as observaciones,
  estado,
  operador_asignado,
  fecha_asignacion,
  fecha_inicio_transito,
  fecha_finalizacion,
  estado_facturacion,
  fecha_facturacion,
  fecha_pago,
  NULL as fecha_archivado,
  NULL as motivo_archivo,
  created_at,
  updated_at,
  'embarques_finalizados' as tabla_origen
FROM embarques_finalizados

UNION ALL

-- Embarques Archivados
SELECT 
  id,
  folio,
  cliente,
  origen,
  destino,
  tipo_material,
  cantidad_material,
  precio_flete,
  NULL as observaciones,
  estado,
  operador_asignado,
  fecha_asignacion,
  fecha_inicio_transito,
  fecha_finalizacion,
  estado_facturacion,
  fecha_facturacion,
  fecha_pago,
  fecha_archivado,
  motivo_archivo,
  created_at,
  updated_at,
  'embarques_archivados' as tabla_origen
FROM embarques_archivados

UNION ALL

-- Embarques Cancelados
SELECT 
  id,
  folio,
  cliente,
  origen,
  destino,
  tipo_material,
  cantidad_material,
  precio_flete,
  NULL as observaciones,
  estado,
  operador_asignado,
  NULL as fecha_asignacion,
  NULL as fecha_inicio_transito,
  NULL as fecha_finalizacion,
  NULL as estado_facturacion,
  NULL as fecha_facturacion,
  NULL as fecha_pago,
  fecha_cancelacion as fecha_archivado,
  motivo_cancelacion as motivo_archivo,
  created_at,
  NULL as updated_at,
  'embarques_cancelados' as tabla_origen
FROM embarques_cancelados;

-- Crear vista simplificada para compatibilidad con código existente
CREATE OR REPLACE VIEW embarques_completa_new AS
SELECT 
  id,
  folio,
  cliente,
  origen,
  destino,
  tipo_material,
  cantidad_material,
  precio_flete,
  estado,
  estado_facturacion,
  operador_asignado,
  fecha_asignacion,
  fecha_inicio_transito,
  fecha_finalizacion,
  created_at,
  tabla_origen
FROM embarques_completa_v2
ORDER BY created_at DESC;

-- Comentarios para documentación
COMMENT ON VIEW embarques_completa_v2 IS 'Vista unificada completa de todas las tablas desacopladas de embarques';
COMMENT ON VIEW embarques_completa_new IS 'Vista simplificada compatible con código existente, basada en arquitectura desacoplada';