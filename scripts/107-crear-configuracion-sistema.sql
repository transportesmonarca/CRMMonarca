-- Script: 107-crear-configuracion-sistema.sql
-- Propósito: Crear tabla de configuración global del sistema
-- Fecha: 24 de septiembre de 2025
-- Descripción: Esta tabla almacenará configuraciones globales como el precio único de flete falso

BEGIN;

-- Crear tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS configuracion_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    descripcion TEXT,
    tipo_dato VARCHAR(50) DEFAULT 'texto', -- texto, numero, booleano, json
    categoria VARCHAR(100) DEFAULT 'general',
    activo BOOLEAN DEFAULT true,
    usuario_creacion TEXT,
    usuario_modificacion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_configuracion_sistema_clave ON configuracion_sistema(clave);
CREATE INDEX IF NOT EXISTS idx_configuracion_sistema_categoria ON configuracion_sistema(categoria);
CREATE INDEX IF NOT EXISTS idx_configuracion_sistema_activo ON configuracion_sistema(activo);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION actualizar_timestamp_configuracion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_configuracion_sistema ON configuracion_sistema;
CREATE TRIGGER trigger_actualizar_configuracion_sistema
    BEFORE UPDATE ON configuracion_sistema
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_timestamp_configuracion();

-- Insertar configuración inicial para flete falso
INSERT INTO configuracion_sistema (clave, valor, descripcion, tipo_dato, categoria, usuario_creacion) 
VALUES (
    'flete_falso_precio_global',
    '800.00',
    'Precio único global para todos los fletes en falso (contingencias)',
    'numero',
    'pagos_operadores',
    'sistema'
) ON CONFLICT (clave) DO NOTHING;

-- Insertar otras configuraciones del sistema que podrían ser útiles
INSERT INTO configuracion_sistema (clave, valor, descripcion, tipo_dato, categoria, usuario_creacion) 
VALUES 
    ('empresa_nombre', 'Transportes Monarca', 'Nombre de la empresa', 'texto', 'empresa', 'sistema'),
    ('moneda_default', 'MXN', 'Moneda por defecto del sistema', 'texto', 'general', 'sistema'),
    ('iva_porcentaje', '16.00', 'Porcentaje de IVA aplicable', 'numero', 'facturacion', 'sistema'),
    ('folio_prefijo', 'TIM', 'Prefijo para los folios de embarques', 'texto', 'embarques', 'sistema')
ON CONFLICT (clave) DO NOTHING;

-- Comentarios en las tablas
COMMENT ON TABLE configuracion_sistema IS 'Tabla de configuraciones globales del sistema';
COMMENT ON COLUMN configuracion_sistema.clave IS 'Identificador único de la configuración';
COMMENT ON COLUMN configuracion_sistema.valor IS 'Valor de la configuración almacenado como texto';
COMMENT ON COLUMN configuracion_sistema.tipo_dato IS 'Tipo de dato para casting: texto, numero, booleano, json';
COMMENT ON COLUMN configuracion_sistema.categoria IS 'Categoría para agrupar configuraciones relacionadas';

COMMIT;

-- Verificar que se creó correctamente
SELECT 
    clave,
    valor,
    descripcion,
    categoria,
    created_at
FROM configuracion_sistema 
ORDER BY categoria, clave;