/*
 * Idempotent SQL to create RPC function actualizar_precio_embarque
 * This function updates `embarques.precio_flete` and inserts an audit
 * row into `embarque_modificaciones` in a single transaction.
 *
 * Usage (example):
 *   SELECT public.actualizar_precio_embarque('00000000-0000-0000-0000-000000000000', 1250.50, 'user@company', 'Corrección de tarifa');
 */

-- Ensure uuid generator is available (pgcrypto provides gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create or replace the RPC function
CREATE OR REPLACE FUNCTION public.actualizar_precio_embarque(
  p_embarque_id uuid,
  p_precio numeric,
  p_usuario text,
  p_razon text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prev numeric;
  v_new numeric;
  v_mod_id uuid := gen_random_uuid();
BEGIN
  -- Lock the embarque row to avoid races
  SELECT precio_flete INTO v_prev
  FROM embarques
  WHERE id = p_embarque_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'embarque % no encontrado', p_embarque_id;
  END IF;

  -- Update the price on the embarque (always update precio_flete per requirement)
  UPDATE embarques
  SET precio_flete = p_precio
  WHERE id = p_embarque_id;

  SELECT precio_flete INTO v_new FROM embarques WHERE id = p_embarque_id;

  -- Insert audit row
  INSERT INTO embarque_modificaciones(
    id,
    embarque_id,
    precio_flete_original,
    precio_flete_nuevo,
    moneda_flete,
    razon,
    usuario_modificacion,
    created_at
  )
  VALUES (
    v_mod_id,
    p_embarque_id,
    v_prev,
    v_new,
    (SELECT moneda_flete FROM embarques WHERE id = p_embarque_id),
    p_razon,
    p_usuario,
    now()
  );

  RETURN v_mod_id;
END;
$$;

-- Optional: grant execute to authenticated role (adjust role name as needed)
-- GRANT EXECUTE ON FUNCTION public.actualizar_precio_embarque(uuid,numeric,text,text) TO authenticated;

-- Example call (replace with a real embarque id):
-- SELECT public.actualizar_precio_embarque('your-embarque-uuid', 1500.00, 'ivan@company', 'Prueba de actualización de precio');
