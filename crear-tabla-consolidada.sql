-- SCRIPT SQL PARA CREAR TABLA EMBARQUES CONSOLIDADA
-- Combina los mejores aspectos de ambas arquitecturas (legacy + normalizada)

-- =====================================================================
-- 1. CREAR TABLA CONSOLIDADA CON TODOS LOS CAMPOS NECESARIOS
-- =====================================================================

CREATE TABLE IF NOT EXISTS embarques_consolidada (
    -- === CAMPOS PRINCIPALES ===
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio VARCHAR(100) UNIQUE NOT NULL,
    
    -- === INFORMACIÓN BÁSICA ===
    cliente_id UUID REFERENCES clientes(id),
    operador_id UUID REFERENCES operadores(id),
    camion_id UUID REFERENCES camiones(id),
    remolque_id UUID REFERENCES remolques(id),
    tipo_servicio_id UUID REFERENCES tipos_servicio(id),
    
    -- === UBICACIONES ===
    origen TEXT,
    destino TEXT,
    lugar_recolecta TEXT,
    direccion_recolecta TEXT,
    direccion_entrega TEXT,
    
    -- === FECHAS Y TIEMPOS ===
    fecha_recolecta DATE,
    hora_recolecta TIME,
    fecha_entrega DATE,
    hora_entrega TIME,
    tiempo_recolecta VARCHAR(50),
    tiempo_entrega VARCHAR(50),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_completado TIMESTAMP WITH TIME ZONE,
    fecha_cancelacion TIMESTAMP WITH TIME ZONE,
    fecha_finalizacion TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- === CARGA ===
    contenido TEXT,
    peso DECIMAL(10,2),
    
    -- === ESTADOS ===
    estado VARCHAR(50) DEFAULT 'creado',
    estado_facturacion VARCHAR(50) DEFAULT 'pendiente_facturacion',
    
    -- === INFORMACIÓN ADICIONAL ===
    observaciones TEXT,
    observaciones_facturacion TEXT,
    observaciones_archivo TEXT,
    carta_porte VARCHAR(100),
    
    -- === CAMPOS INTERNACIONALES (legacy) ===
    load_number VARCHAR(100),
    patente_agente_aduanal VARCHAR(100),
    aduana_cruce VARCHAR(100),
    dueno_mercancia TEXT,
    representante_cliente VARCHAR(255),
    info_representante JSONB,
    
    -- === FACTURACIÓN ===
    precio_flete DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'MXN',
    folio_factura_1 VARCHAR(100),
    folio_factura_2 VARCHAR(100),
    folio_factura_3 VARCHAR(100),
    folio_factura_4 VARCHAR(100),
    fecha_envio_cliente DATE,
    fecha_pago_cliente DATE,
    fecha_pago DATE,
    fecha_pago_1 DATE,
    fecha_pago_2 DATE,
    fecha_pago_3 DATE,
    fecha_pago_4 DATE,
    referencia_pago VARCHAR(200),
    referencia_pago_1 TEXT,
    referencia_pago_2 TEXT,
    referencia_pago_3 TEXT,
    referencia_pago_4 TEXT,
    cantidad_final_facturada DECIMAL(12,2),
    pagado BOOLEAN DEFAULT FALSE,
    
    -- === ARCHIVADO ===
    fecha_archivado TIMESTAMP WITH TIME ZONE,
    usuario_archivo VARCHAR(255),
    motivo_archivo TEXT,
    
    -- === REMOLQUE MANUAL ===
    remolque_manual BOOLEAN DEFAULT FALSE,
    remolque_numero_economico VARCHAR(50),
    remolque_placa VARCHAR(20),
    
    -- === CAMPOS DE CONTROL ===
    modificado BOOLEAN DEFAULT FALSE,
    tabla_origen VARCHAR(20), -- 'embarques' o 'embarques_nuevo'
    migrado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    migrado_por VARCHAR(100) DEFAULT 'script_consolidacion',
    
    -- === COMPATIBILIDAD ===
    reporte_cliente_url TEXT,
    tipo_servicio_slug TEXT -- Para imports CSV
);

-- =====================================================================
-- 2. CREAR ÍNDICES PARA PERFORMANCE
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_embarques_consolidada_folio ON embarques_consolidada(folio);
CREATE INDEX IF NOT EXISTS idx_embarques_consolidada_estado ON embarques_consolidada(estado);
CREATE INDEX IF NOT EXISTS idx_embarques_consolidada_estado_facturacion ON embarques_consolidada(estado_facturacion);
CREATE INDEX IF NOT EXISTS idx_embarques_consolidada_cliente_id ON embarques_consolidada(cliente_id);
CREATE INDEX IF NOT EXISTS idx_embarques_consolidada_operador_id ON embarques_consolidada(operador_id);
CREATE INDEX IF NOT EXISTS idx_embarques_consolidada_fecha_creacion ON embarques_consolidada(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_embarques_consolidada_fecha_recolecta ON embarques_consolidada(fecha_recolecta);
CREATE INDEX IF NOT EXISTS idx_embarques_consolidada_fecha_archivado ON embarques_consolidada(fecha_archivado DESC);
CREATE INDEX IF NOT EXISTS idx_embarques_consolidada_tabla_origen ON embarques_consolidada(tabla_origen);

-- =====================================================================
-- 3. AGREGAR CONSTRAINTS
-- =====================================================================

-- Validar estados
ALTER TABLE embarques_consolidada 
ADD CONSTRAINT chk_embarques_consolidada_estado 
CHECK (estado IN (
    'creado', 'asignado', 'en_transito', 'finalizado', 
    'listo-para-asignar', 'cancelado', 'archivado'
));

ALTER TABLE embarques_consolidada 
ADD CONSTRAINT chk_embarques_consolidada_estado_facturacion 
CHECK (estado_facturacion IN (
    'pendiente_facturacion', 'facturado', 'pagado', 'archivado'
));

-- Validar tabla origen
ALTER TABLE embarques_consolidada 
ADD CONSTRAINT chk_embarques_consolidada_tabla_origen 
CHECK (tabla_origen IN ('embarques', 'embarques_nuevo'));

-- =====================================================================
-- 4. FUNCIÓN PARA ACTUALIZAR UPDATED_AT AUTOMÁTICAMENTE
-- =====================================================================

CREATE OR REPLACE FUNCTION update_embarques_consolidada_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_update_embarques_consolidada_updated_at ON embarques_consolidada;
CREATE TRIGGER trigger_update_embarques_consolidada_updated_at
    BEFORE UPDATE ON embarques_consolidada
    FOR EACH ROW
    EXECUTE FUNCTION update_embarques_consolidada_updated_at();

-- =====================================================================
-- 5. COMENTARIOS DESCRIPTIVOS
-- =====================================================================

COMMENT ON TABLE embarques_consolidada IS 'Tabla consolidada que combina embarques legacy y embarques_nuevo';
COMMENT ON COLUMN embarques_consolidada.tabla_origen IS 'Tabla de origen: embarques (legacy) o embarques_nuevo (normalizado)';
COMMENT ON COLUMN embarques_consolidada.migrado_en IS 'Fecha de migración a tabla consolidada';
COMMENT ON COLUMN embarques_consolidada.estado IS 'Estado del embarque: creado, asignado, en_transito, finalizado, listo-para-asignar, cancelado, archivado';
COMMENT ON COLUMN embarques_consolidada.estado_facturacion IS 'Estado de facturación: pendiente_facturacion, facturado, pagado, archivado';

-- =====================================================================
-- VERIFICACIÓN FINAL
-- =====================================================================

-- Mostrar estructura creada
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'embarques_consolidada' 
ORDER BY ordinal_position;

-- Confirmar creación
SELECT 
    'embarques_consolidada' as tabla_creada,
    'Lista para migración de datos' as estado;