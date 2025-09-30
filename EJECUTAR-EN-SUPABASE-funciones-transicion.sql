-- FUNCIONES PARA MOVER EMBARQUES ENTRE TABLAS DESACOPLADAS
-- =========================================================
-- Funciones SQL para manejar transiciones de estado

-- 1. FUNCIÓN: Crear nuevo embarque
CREATE OR REPLACE FUNCTION crear_embarque(
  p_folio VARCHAR(50),
  p_cliente TEXT,
  p_origen TEXT,
  p_destino TEXT,
  p_tipo_material TEXT DEFAULT NULL,
  p_cantidad_material NUMERIC DEFAULT NULL,
  p_precio_flete NUMERIC DEFAULT NULL,
  p_observaciones TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  nuevo_embarque_id UUID;
  resultado JSON;
BEGIN
  -- Verificar que no existe el folio
  IF EXISTS (SELECT 1 FROM embarques_completa_v2 WHERE folio = p_folio) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'El folio ya existe',
      'folio', p_folio
    );
  END IF;
  
  -- Insertar en embarques_creados
  INSERT INTO embarques_creados (
    folio, cliente, origen, destino, tipo_material, 
    cantidad_material, precio_flete, observaciones, created_by
  ) VALUES (
    p_folio, p_cliente, p_origen, p_destino, p_tipo_material,
    p_cantidad_material, p_precio_flete, p_observaciones, p_created_by
  ) RETURNING id INTO nuevo_embarque_id;
  
  -- Construir respuesta
  SELECT json_build_object(
    'success', true,
    'id', nuevo_embarque_id,
    'folio', p_folio,
    'estado', 'creado',
    'tabla', 'embarques_creados'
  ) INTO resultado;
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- 2. FUNCIÓN: Completar embarque (creado -> asignado)
CREATE OR REPLACE FUNCTION completar_embarque(p_folio VARCHAR(50)) 
RETURNS JSON AS $$
DECLARE
  embarque_data RECORD;
  nuevo_id UUID;
  resultado JSON;
BEGIN
  -- Buscar embarque en estado creado
  SELECT * FROM embarques_creados WHERE folio = p_folio INTO embarque_data;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Embarque no encontrado en estado creado',
      'folio', p_folio
    );
  END IF;
  
  -- Mover a embarques_asignados
  INSERT INTO embarques_asignados (
    folio, cliente, origen, destino, tipo_material,
    cantidad_material, precio_flete, observaciones,
    created_at, moved_from_created_at
  ) VALUES (
    embarque_data.folio, embarque_data.cliente, embarque_data.origen,
    embarque_data.destino, embarque_data.tipo_material, embarque_data.cantidad_material,
    embarque_data.precio_flete, embarque_data.observaciones,
    embarque_data.created_at, NOW()
  ) RETURNING id INTO nuevo_id;
  
  -- Eliminar de embarques_creados
  DELETE FROM embarques_creados WHERE folio = p_folio;
  
  -- Respuesta
  SELECT json_build_object(
    'success', true,
    'id', nuevo_id,
    'folio', p_folio,
    'estado_anterior', 'creado',
    'estado_nuevo', 'asignado',
    'tabla_anterior', 'embarques_creados',
    'tabla_nueva', 'embarques_asignados'
  ) INTO resultado;
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- 3. FUNCIÓN: Asignar operador (asignado -> mantener en asignados)
CREATE OR REPLACE FUNCTION asignar_operador(
  p_folio VARCHAR(50),
  p_operador TEXT
) RETURNS JSON AS $$
DECLARE
  resultado JSON;
BEGIN
  -- Actualizar en embarques_asignados
  UPDATE embarques_asignados 
  SET 
    operador_asignado = p_operador,
    fecha_asignacion = NOW()
  WHERE folio = p_folio;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Embarque no encontrado en estado asignado',
      'folio', p_folio
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'folio', p_folio,
    'operador_asignado', p_operador,
    'fecha_asignacion', NOW(),
    'estado', 'asignado'
  );
END;
$$ LANGUAGE plpgsql;

-- 4. FUNCIÓN: Iniciar tránsito (asignado -> en_transito)
CREATE OR REPLACE FUNCTION iniciar_transito(p_folio VARCHAR(50)) 
RETURNS JSON AS $$
DECLARE
  embarque_data RECORD;
  nuevo_id UUID;
BEGIN
  -- Buscar en embarques_asignados
  SELECT * FROM embarques_asignados WHERE folio = p_folio INTO embarque_data;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Embarque no encontrado en estado asignado',
      'folio', p_folio
    );
  END IF;
  
  IF embarque_data.operador_asignado IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No se puede iniciar tránsito sin operador asignado',
      'folio', p_folio
    );
  END IF;
  
  -- Mover a en_transito
  INSERT INTO embarques_en_transito (
    folio, cliente, origen, destino, tipo_material,
    cantidad_material, precio_flete, operador_asignado,
    fecha_asignacion, created_at
  ) VALUES (
    embarque_data.folio, embarque_data.cliente, embarque_data.origen,
    embarque_data.destino, embarque_data.tipo_material, embarque_data.cantidad_material,
    embarque_data.precio_flete, embarque_data.operador_asignado,
    embarque_data.fecha_asignacion, embarque_data.created_at
  ) RETURNING id INTO nuevo_id;
  
  -- Eliminar de asignados
  DELETE FROM embarques_asignados WHERE folio = p_folio;
  
  RETURN json_build_object(
    'success', true,
    'id', nuevo_id,
    'folio', p_folio,
    'estado_anterior', 'asignado',
    'estado_nuevo', 'en-transito',
    'operador', embarque_data.operador_asignado
  );
END;
$$ LANGUAGE plpgsql;

-- 5. FUNCIÓN: Finalizar embarque (en_transito -> finalizado)
CREATE OR REPLACE FUNCTION finalizar_embarque(p_folio VARCHAR(50)) 
RETURNS JSON AS $$
DECLARE
  embarque_data RECORD;
  nuevo_id UUID;
BEGIN
  SELECT * FROM embarques_en_transito WHERE folio = p_folio INTO embarque_data;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Embarque no encontrado en estado en-transito',
      'folio', p_folio
    );
  END IF;
  
  -- Mover a finalizados
  INSERT INTO embarques_finalizados (
    folio, cliente, origen, destino, tipo_material,
    cantidad_material, precio_flete, operador_asignado,
    fecha_asignacion, fecha_inicio_transito, created_at
  ) VALUES (
    embarque_data.folio, embarque_data.cliente, embarque_data.origen,
    embarque_data.destino, embarque_data.tipo_material, embarque_data.cantidad_material,
    embarque_data.precio_flete, embarque_data.operador_asignado,
    embarque_data.fecha_asignacion, embarque_data.fecha_inicio_transito, 
    embarque_data.created_at
  ) RETURNING id INTO nuevo_id;
  
  DELETE FROM embarques_en_transito WHERE folio = p_folio;
  
  RETURN json_build_object(
    'success', true,
    'id', nuevo_id,
    'folio', p_folio,
    'estado_anterior', 'en-transito',
    'estado_nuevo', 'finalizado',
    'fecha_finalizacion', NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- 6. FUNCIÓN: Archivar embarque (finalizado -> archivado)
CREATE OR REPLACE FUNCTION archivar_embarque(
  p_folio VARCHAR(50),
  p_motivo TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  embarque_data RECORD;
  nuevo_id UUID;
BEGIN
  SELECT * FROM embarques_finalizados WHERE folio = p_folio INTO embarque_data;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Embarque no encontrado en estado finalizado',
      'folio', p_folio
    );
  END IF;
  
  -- Mover a archivados
  INSERT INTO embarques_archivados (
    folio, cliente, origen, destino, tipo_material,
    cantidad_material, precio_flete, operador_asignado,
    fecha_asignacion, fecha_inicio_transito, fecha_finalizacion,
    estado_facturacion, fecha_facturacion, fecha_pago,
    motivo_archivo, created_at
  ) VALUES (
    embarque_data.folio, embarque_data.cliente, embarque_data.origen,
    embarque_data.destino, embarque_data.tipo_material, embarque_data.cantidad_material,
    embarque_data.precio_flete, embarque_data.operador_asignado,
    embarque_data.fecha_asignacion, embarque_data.fecha_inicio_transito,
    embarque_data.fecha_finalizacion, embarque_data.estado_facturacion,
    embarque_data.fecha_facturacion, embarque_data.fecha_pago,
    p_motivo, embarque_data.created_at
  ) RETURNING id INTO nuevo_id;
  
  DELETE FROM embarques_finalizados WHERE folio = p_folio;
  
  RETURN json_build_object(
    'success', true,
    'id', nuevo_id,
    'folio', p_folio,
    'estado_anterior', 'finalizado',
    'estado_nuevo', 'archivado',
    'fecha_archivado', NOW(),
    'motivo', p_motivo
  );
END;
$$ LANGUAGE plpgsql;

-- 7. FUNCIÓN: Cancelar embarque (desde cualquier estado -> cancelado)
CREATE OR REPLACE FUNCTION cancelar_embarque(
  p_folio VARCHAR(50),
  p_motivo TEXT,
  p_cancelado_por UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  embarque_data RECORD;
  estado_anterior TEXT;
  tabla_anterior TEXT;
  nuevo_id UUID;
BEGIN
  -- Buscar en todas las tablas
  SELECT *, 'embarques_creados' as tabla, 'creado' as estado_act 
  FROM embarques_creados WHERE folio = p_folio
  UNION ALL
  SELECT *, 'embarques_asignados' as tabla, 'asignado' as estado_act 
  FROM embarques_asignados WHERE folio = p_folio
  UNION ALL
  SELECT *, 'embarques_en_transito' as tabla, 'en-transito' as estado_act 
  FROM embarques_en_transito WHERE folio = p_folio
  UNION ALL
  SELECT *, 'embarques_finalizados' as tabla, 'finalizado' as estado_act 
  FROM embarques_finalizados WHERE folio = p_folio
  LIMIT 1
  INTO embarque_data;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Embarque no encontrado',
      'folio', p_folio
    );
  END IF;
  
  estado_anterior := embarque_data.estado_act;
  tabla_anterior := embarque_data.tabla;
  
  -- Insertar en cancelados
  INSERT INTO embarques_cancelados (
    folio, cliente, origen, destino, tipo_material,
    cantidad_material, precio_flete, operador_asignado,
    estado_anterior, motivo_cancelacion, cancelado_por, created_at
  ) VALUES (
    embarque_data.folio, embarque_data.cliente, embarque_data.origen,
    embarque_data.destino, embarque_data.tipo_material, embarque_data.cantidad_material,
    embarque_data.precio_flete, embarque_data.operador_asignado,
    estado_anterior, p_motivo, p_cancelado_por, embarque_data.created_at
  ) RETURNING id INTO nuevo_id;
  
  -- Eliminar de tabla original
  EXECUTE format('DELETE FROM %I WHERE folio = $1', tabla_anterior) 
    USING p_folio;
  
  RETURN json_build_object(
    'success', true,
    'id', nuevo_id,
    'folio', p_folio,
    'estado_anterior', estado_anterior,
    'estado_nuevo', 'cancelado',
    'tabla_anterior', tabla_anterior,
    'motivo', p_motivo
  );
END;
$$ LANGUAGE plpgsql;