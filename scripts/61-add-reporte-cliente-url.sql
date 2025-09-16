-- Add a URL field on embarques to store a client-facing link for the Reporte Cliente view
ALTER TABLE embarques
  ADD COLUMN IF NOT EXISTS reporte_cliente_url TEXT;

-- Helpful index for filtering (optional if used frequently)
-- CREATE INDEX IF NOT EXISTS idx_embarques_reporte_cliente_url ON embarques((reporte_cliente_url IS NOT NULL));
