-- Script 108: Normalización de la tabla embarques
-- Divide la tabla embarques (82 columnas) en 6 tablas más manejables

-- ====================================
-- 1. TABLA PRINCIPAL: embarques
-- ====================================
-- Mantendrá solo las columnas esenciales y referencias FK
CREATE TABLE IF NOT EXISTS embarques_nuevo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folio VARCHAR(50) UNIQUE NOT NULL,
    
    -- Referencias FK
    cliente_id UUID REFERENCES clientes(id),
    tipo_servicio_id UUID REFERENCES tipos_servicio(id),
    operador_id UUID REFERENCES operadores(id),
    camion_id UUID REFERENCES camiones(id),
    remolque_id UUID REFERENCES remolques(id),
    
    -- Campos básicos
    contenido TEXT,
    peso DECIMAL(10,2),
    load_number VARCHAR(100),
    
    -- Control y timestamps
    estado VARCHAR(50) DEFAULT 'pendiente',
    modificado BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- ====================================
-- 2. UBICACIONES Y LOGÍSTICA: embarques_ubicaciones
-- ====================================
CREATE TABLE IF NOT EXISTS embarques_ubicaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID REFERENCES embarques_nuevo(id) ON DELETE CASCADE,
    
    -- Origen
    origen VARCHAR(255),
    lugar_recolecta VARCHAR(255),
    direccion_recolecta TEXT,
    fecha_recolecta DATE,
    hora_recolecta TIME,
    tiempo_recolecta VARCHAR(50),
    
    -- Destino
    destino VARCHAR(255),
    direccion_entrega TEXT,
    fecha_entrega DATE,
    hora_entrega TIME,
    tiempo_entrega VARCHAR(50),
    
    -- Aduanas (para cruces fronterizos)
    aduana_cruce VARCHAR(100),
    patente_agente_aduanal VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- ====================================
-- 3. INFORMACIÓN FINANCIERA: embarques_financiero
-- ====================================
CREATE TABLE IF NOT EXISTS embarques_financiero (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID REFERENCES embarques_nuevo(id) ON DELETE CASCADE,
    
    -- Precios principales
    precio_flete DECIMAL(10,2),
    moneda_flete VARCHAR(10) DEFAULT 'MXN',
    
    -- Sistema QuickPaid
    quickpaid_enabled BOOLEAN DEFAULT false,
    quickpaid_percent DECIMAL(5,2),
    quickpaid_descuento DECIMAL(10,2),
    precio_quickpaid DECIMAL(10,2),
    
    -- Pagos a operador
    pago_operador DECIMAL(10,2),
    flete_falso BOOLEAN DEFAULT false,
    pago_operador_flete_falso DECIMAL(10,2),
    
    -- Justificaciones de precio
    ultima_justificacion_precio TEXT,
    ultima_actualizacion_precio_por VARCHAR(100),
    ultima_actualizacion_precio_fecha TIMESTAMP,
    ultima_modificacion_precio_por VARCHAR(100),
    fecha_ultima_modificacion_precio TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- ====================================
-- 4. ESTADOS Y FECHAS: embarques_estado
-- ====================================
CREATE TABLE IF NOT EXISTS embarques_estado (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID REFERENCES embarques_nuevo(id) ON DELETE CASCADE,
    
    -- Estados principales
    estado_facturacion VARCHAR(50),
    pagado BOOLEAN DEFAULT false,
    
    -- Fechas de control
    fecha_creacion TIMESTAMP DEFAULT now(),
    fecha_finalizacion TIMESTAMP,
    fecha_pago TIMESTAMP,
    fecha_archivado TIMESTAMP,
    fecha_cancelacion TIMESTAMP,
    
    -- Información de archivado
    usuario_archivo VARCHAR(100),
    motivo_archivo TEXT,
    observaciones_archivo TEXT,
    
    -- Información de cancelación
    cancelado_por VARCHAR(100),
    motivo_cancelacion TEXT,
    
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- ====================================
-- 5. DOCUMENTOS: embarques_documentos
-- ====================================
CREATE TABLE IF NOT EXISTS embarques_documentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID REFERENCES embarques_nuevo(id) ON DELETE CASCADE,
    
    -- Carta porte
    carta_porte VARCHAR(100),
    
    -- Facturas múltiples (sistema actual permite hasta 4)
    folio_factura_1 VARCHAR(100),
    folio_factura_2 VARCHAR(100),
    folio_factura_3 VARCHAR(100),
    folio_factura_4 VARCHAR(100),
    
    -- Fechas de envío al cliente
    fecha_envio_cliente_1 DATE,
    fecha_envio_cliente_2 DATE,
    fecha_envio_cliente_3 DATE,
    fecha_envio_cliente_4 DATE,
    
    -- Fechas de pago
    fecha_pago_1 DATE,
    fecha_pago_2 DATE,
    fecha_pago_3 DATE,
    fecha_pago_4 DATE,
    
    -- Referencias de pago
    referencia_pago VARCHAR(100),
    referencia_pago_1 VARCHAR(100),
    referencia_pago_2 VARCHAR(100),
    referencia_pago_3 VARCHAR(100),
    referencia_pago_4 VARCHAR(100),
    
    -- Cantidad final facturada
    cantidad_final_facturada DECIMAL(10,2),
    
    -- Reporte para cliente
    reporte_cliente_url TEXT,
    
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- ====================================
-- 6. CAMPOS ADICIONALES: embarques_adicional
-- ====================================
CREATE TABLE IF NOT EXISTS embarques_adicional (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID REFERENCES embarques_nuevo(id) ON DELETE CASCADE,
    
    -- Observaciones
    observaciones TEXT,
    observaciones_facturacion TEXT,
    
    -- Información del cliente
    dueno_mercancia VARCHAR(255),
    representante_cliente VARCHAR(255),
    info_representante TEXT,
    
    -- Información de remolque manual
    remolque_manual BOOLEAN DEFAULT false,
    remolque_numero_economico VARCHAR(50),
    remolque_placa VARCHAR(50),
    
    -- Campos adicionales del sistema
    tipo_servicio_slug VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- ====================================
-- ÍNDICES PARA RENDIMIENTO
-- ====================================

-- Índices principales
CREATE INDEX IF NOT EXISTS idx_embarques_nuevo_folio ON embarques_nuevo(folio);
CREATE INDEX IF NOT EXISTS idx_embarques_nuevo_cliente ON embarques_nuevo(cliente_id);
CREATE INDEX IF NOT EXISTS idx_embarques_nuevo_operador ON embarques_nuevo(operador_id);
CREATE INDEX IF NOT EXISTS idx_embarques_nuevo_estado ON embarques_nuevo(estado);

-- Índices de relación
CREATE INDEX IF NOT EXISTS idx_embarques_ubicaciones_embarque ON embarques_ubicaciones(embarque_id);
CREATE INDEX IF NOT EXISTS idx_embarques_financiero_embarque ON embarques_financiero(embarque_id);
CREATE INDEX IF NOT EXISTS idx_embarques_estado_embarque ON embarques_estado(embarque_id);
CREATE INDEX IF NOT EXISTS idx_embarques_documentos_embarque ON embarques_documentos(embarque_id);
CREATE INDEX IF NOT EXISTS idx_embarques_adicional_embarque ON embarques_adicional(embarque_id);

-- Índices por fechas
CREATE INDEX IF NOT EXISTS idx_embarques_ubicaciones_fecha_recolecta ON embarques_ubicaciones(fecha_recolecta);
CREATE INDEX IF NOT EXISTS idx_embarques_ubicaciones_fecha_entrega ON embarques_ubicaciones(fecha_entrega);
CREATE INDEX IF NOT EXISTS idx_embarques_estado_fecha_creacion ON embarques_estado(fecha_creacion);

-- ====================================
-- TRIGGERS PARA UPDATE_AT
-- ====================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para cada tabla
CREATE TRIGGER update_embarques_nuevo_updated_at BEFORE UPDATE ON embarques_nuevo
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_embarques_ubicaciones_updated_at BEFORE UPDATE ON embarques_ubicaciones
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_embarques_financiero_updated_at BEFORE UPDATE ON embarques_financiero
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_embarques_estado_updated_at BEFORE UPDATE ON embarques_estado
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_embarques_documentos_updated_at BEFORE UPDATE ON embarques_documentos
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_embarques_adicional_updated_at BEFORE UPDATE ON embarques_adicional
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ====================================
-- COMENTARIOS
-- ====================================

COMMENT ON TABLE embarques_nuevo IS 'Tabla principal de embarques normalizada - solo campos esenciales';
COMMENT ON TABLE embarques_ubicaciones IS 'Información de ubicaciones, origen, destino y logística';
COMMENT ON TABLE embarques_financiero IS 'Información financiera, precios, pagos y quickpaid';
COMMENT ON TABLE embarques_estado IS 'Estados del embarque, fechas de control y archivado';
COMMENT ON TABLE embarques_documentos IS 'Documentos, facturas, carta porte y referencias';
COMMENT ON TABLE embarques_adicional IS 'Campos adicionales, observaciones e información extra';