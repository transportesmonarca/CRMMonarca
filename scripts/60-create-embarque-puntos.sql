-- Crea tabla para almacenar múltiples puntos de recolecta/entrega por embarque
CREATE TABLE IF NOT EXISTS embarque_puntos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  embarque_id UUID REFERENCES embarques(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL, -- 'recolecta' o 'entrega'
  orden INTEGER NOT NULL DEFAULT 1,
  direccion TEXT,
  fecha DATE,
  hora TIME,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embarque_puntos_embarque_id ON embarque_puntos(embarque_id);
CREATE INDEX IF NOT EXISTS idx_embarque_puntos_tipo ON embarque_puntos(tipo);
