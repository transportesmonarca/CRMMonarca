/*
 * Actualización del RPC function actualizar_precio_embarque
 * Ahora soporta actualizar tanto el precio como la moneda del flete
 *
 * Usage (ejemplo):
 *   SELECT public.actualizar_precio_embarque('00000000-0000-0000-0000-000000000000', 1250.50, 'USD', 'user@company', 'Cambio de moneda y precio');
 */

-- Ensure uuid generator is available (pgcrypto provides gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop the old function to recreate with new signature
DROP FUNCTION IF EXISTS public.actualizar_precio_embarque(uuid, numeric, text, text);

-- Create or replace the RPC function with support for currency
CREATE OR REPLACE FUNCTION public.actualizar_precio_embarque(
  p_embarque_id uuid,
  p_precio numeric,
  p_moneda text DEFAULT NULL,
  p_usuario text DEFAULT 'system',
  p_razon text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prev_precio numeric;
  v_prev_moneda text;
  v_new_precio numeric;
  v_new_moneda text;
  v_mod_id uuid := gen_random_uuid();
BEGIN
  -- Lock the embarque row to avoid races
  SELECT precio_flete, moneda_flete INTO v_prev_precio, v_prev_moneda
  FROM embarques
  WHERE id = p_embarque_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Embarque % no encontrado', p_embarque_id;
  END IF;

  -- Validate currency if provided
  IF p_moneda IS NOT NULL AND p_moneda NOT IN ('MXN', 'USD') THEN
    RAISE EXCEPTION 'Moneda debe ser MXN o USD, recibido: %', p_moneda;
  END IF;

  -- Validate price
  IF p_precio IS NULL OR p_precio <= 0 THEN
    RAISE EXCEPTION 'Precio debe ser un número mayor a 0, recibido: %', p_precio;
  END IF;

  -- Determine new currency (use provided or keep current)
  v_new_moneda := COALESCE(p_moneda, v_prev_moneda, 'MXN');

  -- Update the price and currency on the embarque
  UPDATE embarques
  SET 
    precio_flete = p_precio,
    moneda_flete = v_new_moneda,
    monto_flete = p_precio, -- Also update monto_flete for consistency
    updated_at = now()
  WHERE id = p_embarque_id;

  -- Get the updated values to confirm
  SELECT precio_flete, moneda_flete INTO v_new_precio, v_new_moneda 
  FROM embarques 
  WHERE id = p_embarque_id;

  -- Insert audit row only if there was a change
  IF v_prev_precio IS DISTINCT FROM v_new_precio OR v_prev_moneda IS DISTINCT FROM v_new_moneda THEN
    -- Try to insert with new columns, fallback to basic structure if they don't exist
    BEGIN
      INSERT INTO embarque_modificaciones(
        id,
        embarque_id,
        precio_flete_original,
        precio_flete_nuevo,
        moneda_flete_original,
        moneda_flete_nueva,
        moneda_flete,
        razon,
        usuario_modificacion,
        created_at
      )
      VALUES (
        v_mod_id,
        p_embarque_id,
        v_prev_precio,
        v_new_precio,
        v_prev_moneda,
        v_new_moneda,
        v_new_moneda,
        COALESCE(p_razon, 'Actualización de precio/moneda desde sistema'),
        COALESCE(p_usuario, 'system'),
        now()
      );
    EXCEPTION 
      WHEN undefined_column THEN
        -- Fallback to basic columns that should always exist
        INSERT INTO embarque_modificaciones(
          id,
          embarque_id,
          precio_flete_original,
          precio_flete_nuevo,
          razon,
          usuario_modificacion,
          created_at
        )
        VALUES (
          v_mod_id,
          p_embarque_id,
          v_prev_precio,
          v_new_precio,
          COALESCE(p_razon, 'Actualización de precio/moneda desde sistema'),
          COALESCE(p_usuario, 'system'),
          now()
        );
    END;
  END IF;

  RETURN v_mod_id;
END;
$$;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION public.actualizar_precio_embarque(uuid, numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_precio_embarque(uuid, numeric, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.actualizar_precio_embarque(uuid, numeric, text, text, text) TO service_role;

-- Example calls:
-- Actualizar solo precio:
-- SELECT public.actualizar_precio_embarque('your-embarque-uuid', 1500.00, NULL, 'ivan@company', 'Actualización de precio');

-- Actualizar precio y moneda:
-- SELECT public.actualizar_precio_embarque('your-embarque-uuid', 850.00, 'USD', 'ivan@company', 'Cambio a dólares');

-- Con parámetros mínimos:
-- SELECT public.actualizar_precio_embarque('your-embarque-uuid', 1200.50);