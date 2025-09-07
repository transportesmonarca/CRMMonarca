-- Script: Create or replace the view `public.vista_embarques_completa`
-- Reason: client reported PGRST205 "Could not find the table 'public.vista_embarques_completa'"
-- Run this in the Supabase SQL editor (or psql) to recreate the view.

CREATE OR REPLACE VIEW public.vista_embarques_completa AS
SELECT
  e.*,
  c.nombre AS cliente_nombre,
  cam.numero_economico AS camion_numero,
  cam.placas AS camion_placas,
  o.nombre AS operador_nombre,
  o.apellidos AS operador_apellidos,
  ts.nombre AS tipo_servicio_nombre
FROM public.embarques e
LEFT JOIN public.clientes c ON c.id = e.cliente_id
LEFT JOIN public.camiones cam ON cam.id = e.camion_id
LEFT JOIN public.operadores o ON o.id = e.operador_id
LEFT JOIN public.tipos_servicio ts ON ts.id = e.tipo_servicio_id;

-- Quick verification: run this after the CREATE VIEW to confirm the view returns rows
-- SELECT * FROM public.vista_embarques_completa LIMIT 5;

-- Optional: if your frontend uses the anon/public role and needs direct SELECT access,
-- grant SELECT on the view (only do this if your project's security model allows it):
-- GRANT SELECT ON public.vista_embarques_completa TO anon;

-- Notes / assumptions:
-- 1) This assumes tables are named: public.embarques, public.clientes, public.camiones,
--    public.operadores, public.tipos_servicio. If your schema or names differ, adjust accordingly.
-- 2) If the view should belong to a different schema than `public`, change the schema name.
-- 3) After running this, refresh the Supabase API/schema cache (Supabase UI: API → click "Refresh" or reload the project),
--    then reload your frontend to confirm the PGRST205 error is resolved.
