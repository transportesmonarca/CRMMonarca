-- ARQUITECTURA DESACOPLADA PARA EMBARQUES
-- =========================================
-- Script SQL para ejecutar en Supabase
-- Reduce dependencia de tabla 'embarques' principal

-- 1. TABLA PARA EMBARQUES CREADOS/BORRADORES
-- Embarques recién creados que aún no han sido completados
CREATE TABLE IF NOT EXISTS embarques_creados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio VARCHAR(50) UNIQUE NOT NULL,
  cliente TEXT,
  origen TEXT NOT NULL,
  destino TEXT NOT NULL,
  tipo_material TEXT,
  cantidad_material NUMERIC,
  precio_flete NUMERIC,
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'creado' CHECK (estado IN ('creado', 'borrador')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. TABLA PARA EMBARQUES ASIGNADOS
-- Embarques completados y listos para asignar operador
CREATE TABLE IF NOT EXISTS embarques_asignados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio VARCHAR(50) UNIQUE NOT NULL,
  cliente TEXT NOT NULL,
  origen TEXT NOT NULL,
  destino TEXT NOT NULL,
  tipo_material TEXT,
  cantidad_material NUMERIC,
  precio_flete NUMERIC,
  observaciones TEXT,
  estado VARCHAR(20) DEFAULT 'asignado',
  operador_asignado TEXT,
  fecha_asignacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  moved_from_created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA PARA EMBARQUES EN TRÁNSITO
-- Embarques que ya iniciaron el viaje
CREATE TABLE IF NOT EXISTS embarques_en_transito (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio VARCHAR(50) UNIQUE NOT NULL,
  cliente TEXT NOT NULL,
  origen TEXT NOT NULL,
  destino TEXT NOT NULL,
  tipo_material TEXT,
  cantidad_material NUMERIC,
  precio_flete NUMERIC,
  operador_asignado TEXT NOT NULL,
  fecha_asignacion TIMESTAMPTZ,
  fecha_inicio_transito TIMESTAMPTZ DEFAULT NOW(),
  ubicacion_actual TEXT,
  porcentaje_avance INTEGER DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'en-transito',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA PARA EMBARQUES FINALIZADOS
-- Embarques completados, listos para facturación
CREATE TABLE IF NOT EXISTS embarques_finalizados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio VARCHAR(50) UNIQUE NOT NULL,
  cliente TEXT NOT NULL,
  origen TEXT NOT NULL,
  destino TEXT NOT NULL,
  tipo_material TEXT,
  cantidad_material NUMERIC,
  precio_flete NUMERIC,
  operador_asignado TEXT NOT NULL,
  fecha_asignacion TIMESTAMPTZ,
  fecha_inicio_transito TIMESTAMPTZ,
  fecha_finalizacion TIMESTAMPTZ DEFAULT NOW(),
  estado VARCHAR(20) DEFAULT 'finalizado',
  estado_facturacion VARCHAR(30) DEFAULT 'pendiente_facturacion' 
    CHECK (estado_facturacion IN ('pendiente_facturacion', 'facturado', 'pagado')),
  fecha_facturacion TIMESTAMPTZ,
  fecha_pago TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA PARA EMBARQUES ARCHIVADOS
-- Embarques completamente procesados y archivados
CREATE TABLE IF NOT EXISTS embarques_archivados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio VARCHAR(50) UNIQUE NOT NULL,
  cliente TEXT NOT NULL,
  origen TEXT NOT NULL,
  destino TEXT NOT NULL,
  tipo_material TEXT,
  cantidad_material NUMERIC,
  precio_flete NUMERIC,
  operador_asignado TEXT,
  fecha_asignacion TIMESTAMPTZ,
  fecha_inicio_transito TIMESTAMPTZ,
  fecha_finalizacion TIMESTAMPTZ,
  fecha_facturacion TIMESTAMPTZ,
  fecha_pago TIMESTAMPTZ,
  fecha_archivado TIMESTAMPTZ DEFAULT NOW(),
  estado VARCHAR(20) DEFAULT 'archivado',
  estado_facturacion VARCHAR(30),
  motivo_archivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA PARA EMBARQUES CANCELADOS
-- Embarques cancelados desde cualquier estado
CREATE TABLE IF NOT EXISTS embarques_cancelados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio VARCHAR(50) UNIQUE NOT NULL,
  cliente TEXT,
  origen TEXT,
  destino TEXT,
  tipo_material TEXT,
  cantidad_material NUMERIC,
  precio_flete NUMERIC,
  operador_asignado TEXT,
  estado_anterior VARCHAR(20),
  fecha_cancelacion TIMESTAMPTZ DEFAULT NOW(),
  motivo_cancelacion TEXT,
  cancelado_por UUID REFERENCES auth.users(id),
  estado VARCHAR(20) DEFAULT 'cancelado',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_embarques_creados_folio ON embarques_creados(folio);
CREATE INDEX IF NOT EXISTS idx_embarques_creados_created_at ON embarques_creados(created_at);
CREATE INDEX IF NOT EXISTS idx_embarques_asignados_folio ON embarques_asignados(folio);
CREATE INDEX IF NOT EXISTS idx_embarques_asignados_operador ON embarques_asignados(operador_asignado);
CREATE INDEX IF NOT EXISTS idx_embarques_en_transito_folio ON embarques_en_transito(folio);
CREATE INDEX IF NOT EXISTS idx_embarques_finalizados_folio ON embarques_finalizados(folio);
CREATE INDEX IF NOT EXISTS idx_embarques_finalizados_estado_facturacion ON embarques_finalizados(estado_facturacion);

-- 8. TRIGGERS PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas
DROP TRIGGER IF EXISTS update_embarques_creados_updated_at ON embarques_creados;
CREATE TRIGGER update_embarques_creados_updated_at 
  BEFORE UPDATE ON embarques_creados 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_embarques_asignados_updated_at ON embarques_asignados;
CREATE TRIGGER update_embarques_asignados_updated_at 
  BEFORE UPDATE ON embarques_asignados 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_embarques_en_transito_updated_at ON embarques_en_transito;
CREATE TRIGGER update_embarques_en_transito_updated_at 
  BEFORE UPDATE ON embarques_en_transito 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_embarques_finalizados_updated_at ON embarques_finalizados;
CREATE TRIGGER update_embarques_finalizados_updated_at 
  BEFORE UPDATE ON embarques_finalizados 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. COMENTARIOS PARA DOCUMENTACIÓN
COMMENT ON TABLE embarques_creados IS 'Embarques recién creados, en estado de borrador o completados pero no asignados';
COMMENT ON TABLE embarques_asignados IS 'Embarques completados y asignados a operadores, listos para iniciar tránsito';
COMMENT ON TABLE embarques_en_transito IS 'Embarques en proceso de transporte, con seguimiento activo';
COMMENT ON TABLE embarques_finalizados IS 'Embarques completados, en proceso de facturación y cobranza';
COMMENT ON TABLE embarques_archivados IS 'Embarques completamente procesados y archivados';
COMMENT ON TABLE embarques_cancelados IS 'Embarques cancelados desde cualquier estado del flujo';

-- 10. PERMISOS RLS (Row Level Security) - BÁSICO
ALTER TABLE embarques_creados ENABLE ROW LEVEL SECURITY;
ALTER TABLE embarques_asignados ENABLE ROW LEVEL SECURITY;
ALTER TABLE embarques_en_transito ENABLE ROW LEVEL SECURITY;
ALTER TABLE embarques_finalizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE embarques_archivados ENABLE ROW LEVEL SECURITY;
ALTER TABLE embarques_cancelados ENABLE ROW LEVEL SECURITY;