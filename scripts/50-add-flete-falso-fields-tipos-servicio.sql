-- Script para agregar campos de configuración de Flete en Falso a tipos_servicio
-- Ejecutar en la base de datos de Supabase para habilitar el pago alternativo.

BEGIN;

ALTER TABLE public.tipos_servicio
  ADD COLUMN IF NOT EXISTS es_flete_falso BOOLEAN DEFAULT FALSE;

ALTER TABLE public.tipos_servicio
  ADD COLUMN IF NOT EXISTS pago_operador_flete_falso NUMERIC(12,2);

COMMENT ON COLUMN public.tipos_servicio.es_flete_falso IS 'Indica si este tipo representa un flete en falso y debe usar el pago alternativo para operadores.';
COMMENT ON COLUMN public.tipos_servicio.pago_operador_flete_falso IS 'Monto que se pagará al operador cuando el embarque se marque como flete en falso.';

-- Asegurar que registros existentes tengan un valor consistente
UPDATE public.tipos_servicio
SET es_flete_falso = COALESCE(es_flete_falso, FALSE)
WHERE es_flete_falso IS NULL;

COMMIT;