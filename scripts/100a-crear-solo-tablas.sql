-- =================================================================
-- PASO 1: CREAR NUEVAS TABLAS NORMALIZADAS
-- Ejecutar ESTE SCRIPT PRIMERO antes de la validación
-- =================================================================

BEGIN;

-- 1.1 TABLA PRINCIPAL (embarques_core)
-- Contiene solo la información esencial y más estable
CREATE TABLE IF NOT EXISTS embarques_core (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folio VARCHAR(50) NOT NULL UNIQUE,
    cliente_id UUID REFERENCES clientes(id),
    operador_id UUID REFERENCES operadores(id),
    camion_id UUID REFERENCES camiones(id),
    remolque_id UUID REFERENCES remolques(id),
    
    -- Información básica de logística
    origen VARCHAR(200) NOT NULL,
    destino VARCHAR(200) NOT NULL,
    contenido TEXT,
    peso DECIMAL(10,2),
    
    -- Estados y fechas críticas
    estado VARCHAR(30) DEFAULT 'creado',
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para embarques_core
CREATE INDEX IF NOT EXISTS idx_embarques_core_folio ON embarques_core(folio);
CREATE INDEX IF NOT EXISTS idx_embarques_core_cliente ON embarques_core(cliente_id);
CREATE INDEX IF NOT EXISTS idx_embarques_core_operador ON embarques_core(operador_id);
CREATE INDEX IF NOT EXISTS idx_embarques_core_estado ON embarques_core(estado);
CREATE INDEX IF NOT EXISTS idx_embarques_core_fecha ON embarques_core(fecha_creacion);

-- 1.2 TABLA DE DETALLES LOGÍSTICOS (embarques_logistica)
CREATE TABLE IF NOT EXISTS embarques_logistica (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID NOT NULL REFERENCES embarques_core(id) ON DELETE CASCADE,
    
    -- Recolecta
    lugar_recolecta VARCHAR(200),
    direccion_recolecta TEXT,
    fecha_recolecta DATE,
    hora_recolecta TIME,
    tiempo_recolecta VARCHAR(50),
    
    -- Entrega
    direccion_entrega TEXT,
    fecha_entrega TIMESTAMP WITH TIME ZONE,
    hora_entrega TIME,
    tiempo_entrega VARCHAR(50),
    
    -- Documentación
    carta_porte VARCHAR(100),
    load_number VARCHAR(100),
    
    -- Aduanas (para embarques internacionales)
    patente_agente_aduanal VARCHAR(100),
    aduana_cruce VARCHAR(100),
    dueno_mercancia VARCHAR(200),
    
    -- Remolques manuales
    remolque_manual BOOLEAN DEFAULT FALSE,
    remolque_numero_economico VARCHAR(50),
    remolque_placa VARCHAR(20),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT uq_embarques_logistica_embarque UNIQUE(embarque_id)
);

CREATE INDEX IF NOT EXISTS idx_embarques_logistica_embarque ON embarques_logistica(embarque_id);

-- 1.3 TABLA DE SERVICIOS Y PRECIOS (embarques_servicios)
CREATE TABLE IF NOT EXISTS embarques_servicios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID NOT NULL REFERENCES embarques_core(id) ON DELETE CASCADE,
    tipo_servicio_id UUID REFERENCES tipos_servicio(id),
    
    -- Precios y moneda
    precio_flete DECIMAL(12,2),
    moneda_flete VARCHAR(3) DEFAULT 'MXN',
    
    -- QuickPaid
    quickpaid_enabled BOOLEAN DEFAULT FALSE,
    quickpaid_percent DECIMAL(5,2),
    quickpaid_descuento DECIMAL(12,2),
    precio_quickpaid DECIMAL(12,2),
    
    -- Flags especiales
    flete_falso BOOLEAN DEFAULT FALSE,
    modificado BOOLEAN DEFAULT FALSE,
    
    -- Pago al operador
    pago_operador DECIMAL(12,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT uq_embarques_servicios_embarque UNIQUE(embarque_id)
);

CREATE INDEX IF NOT EXISTS idx_embarques_servicios_embarque ON embarques_servicios(embarque_id);
CREATE INDEX IF NOT EXISTS idx_embarques_servicios_tipo ON embarques_servicios(tipo_servicio_id);
CREATE INDEX IF NOT EXISTS idx_embarques_servicios_flete_falso ON embarques_servicios(flete_falso);

-- 1.4 TABLA DE FACTURACIÓN (embarques_facturacion)
CREATE TABLE IF NOT EXISTS embarques_facturacion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID NOT NULL REFERENCES embarques_core(id) ON DELETE CASCADE,
    
    -- Estado de facturación
    estado_facturacion VARCHAR(50) DEFAULT 'pendiente_facturacion',
    
    -- Archivado
    fecha_archivado TIMESTAMP WITH TIME ZONE,
    usuario_archivo VARCHAR(255),
    motivo_archivo TEXT,
    observaciones_archivo TEXT,
    
    -- Cancelación
    fecha_cancelacion TIMESTAMP WITH TIME ZONE,
    cancelado_por VARCHAR(255),
    motivo_cancelacion TEXT,
    
    -- Finalización
    fecha_finalizacion TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT uq_embarques_facturacion_embarque UNIQUE(embarque_id)
);

CREATE INDEX IF NOT EXISTS idx_embarques_facturacion_embarque ON embarques_facturacion(embarque_id);
CREATE INDEX IF NOT EXISTS idx_embarques_facturacion_estado ON embarques_facturacion(estado_facturacion);

-- 1.5 TABLA DE ENVÍOS AL CLIENTE (embarques_envios_cliente)
CREATE TABLE IF NOT EXISTS embarques_envios_cliente (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID NOT NULL REFERENCES embarques_core(id) ON DELETE CASCADE,
    
    numero_envio INTEGER NOT NULL, -- 1, 2, 3, 4...
    fecha_envio TIMESTAMP WITH TIME ZONE NOT NULL,
    tipo_envio VARCHAR(50) DEFAULT 'factura', -- 'factura', 'documento', 'seguimiento', etc.
    observaciones TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT uq_embarques_envios_numero UNIQUE(embarque_id, numero_envio)
);

CREATE INDEX IF NOT EXISTS idx_embarques_envios_embarque ON embarques_envios_cliente(embarque_id);
CREATE INDEX IF NOT EXISTS idx_embarques_envios_fecha ON embarques_envios_cliente(fecha_envio);

-- 1.6 TABLA DE PAGOS (embarques_pagos)
CREATE TABLE IF NOT EXISTS embarques_pagos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID NOT NULL REFERENCES embarques_core(id) ON DELETE CASCADE,
    
    numero_pago INTEGER NOT NULL, -- 1, 2, 3, 4...
    fecha_pago DATE NOT NULL,
    referencia_pago VARCHAR(100),
    monto_pago DECIMAL(12,2),
    moneda VARCHAR(3) DEFAULT 'MXN',
    metodo_pago VARCHAR(50), -- 'transferencia', 'cheque', 'efectivo', etc.
    banco VARCHAR(100),
    observaciones TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT uq_embarques_pagos_numero UNIQUE(embarque_id, numero_pago)
);

CREATE INDEX IF NOT EXISTS idx_embarques_pagos_embarque ON embarques_pagos(embarque_id);
CREATE INDEX IF NOT EXISTS idx_embarques_pagos_fecha ON embarques_pagos(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_embarques_pagos_referencia ON embarques_pagos(referencia_pago);

-- 1.7 TABLA DE OBSERVACIONES Y NOTAS (embarques_observaciones)
CREATE TABLE IF NOT EXISTS embarques_observaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID NOT NULL REFERENCES embarques_core(id) ON DELETE CASCADE,
    
    tipo_observacion VARCHAR(50) DEFAULT 'general', -- 'general', 'operador', 'cliente', 'interno'
    observacion TEXT NOT NULL,
    usuario_creacion VARCHAR(100),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embarques_obs_embarque ON embarques_observaciones(embarque_id);
CREATE INDEX IF NOT EXISTS idx_embarques_obs_fecha ON embarques_observaciones(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_embarques_obs_tipo ON embarques_observaciones(tipo_observacion);

-- 1.8 TABLA DE REPRESENTANTES DE CLIENTE (embarques_representantes)
CREATE TABLE IF NOT EXISTS embarques_representantes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID NOT NULL REFERENCES embarques_core(id) ON DELETE CASCADE,
    
    representante_cliente_id UUID, -- Puede referenciar a una tabla de contactos
    info_representante JSONB, -- Información flexible en JSON
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT uq_embarques_representantes_embarque UNIQUE(embarque_id)
);

CREATE INDEX IF NOT EXISTS idx_embarques_repr_embarque ON embarques_representantes(embarque_id);

-- Añadir comentarios para documentación
COMMENT ON TABLE embarques_core IS 'Tabla principal con datos esenciales de embarques (normalizada)';
COMMENT ON TABLE embarques_logistica IS 'Información logística: direcciones, fechas, documentación';
COMMENT ON TABLE embarques_servicios IS 'Datos comerciales: precios, servicios, configuración de pagos';
COMMENT ON TABLE embarques_facturacion IS 'Control administrativo: estados, archivado, cancelación';
COMMENT ON TABLE embarques_envios_cliente IS 'Historial de comunicaciones/envíos al cliente (escalable)';
COMMENT ON TABLE embarques_pagos IS 'Historial de pagos recibidos (escalable)';
COMMENT ON TABLE embarques_observaciones IS 'Notas y comentarios con historial';
COMMENT ON TABLE embarques_representantes IS 'Información de representantes/contactos del cliente';

COMMIT;

-- Verificar que las tablas se crearon correctamente
SELECT 
    '✅ Tablas creadas exitosamente' as resultado,
    COUNT(*) as total_tablas_nuevas
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN (
        'embarques_core',
        'embarques_logistica', 
        'embarques_servicios',
        'embarques_facturacion',
        'embarques_envios_cliente',
        'embarques_pagos',
        'embarques_observaciones',
        'embarques_representantes'
    );

-- Mostrar las tablas creadas
SELECT 
    table_name,
    '✅ CREADA' as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name LIKE 'embarques_%'
    AND table_name != 'embarques'
    AND table_name != 'embarques_backup_migracion'
ORDER BY table_name;