-- ✅ SCRIPT PARA AGREGAR SOPORTE JSON A CONTACTOS
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS contactos_json JSON;
COMMENT ON COLUMN clientes.contactos_json IS 'Almacena contactos ilimitados en formato JSON';
CREATE INDEX IF NOT EXISTS idx_clientes_contactos_json ON clientes USING GIN (contactos_json);