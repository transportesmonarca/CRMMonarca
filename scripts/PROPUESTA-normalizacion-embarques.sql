-- =================================================================
-- PROPUESTA DE NORMALIZACIÓN DE LA TABLA EMBARQUES
-- =================================================================

-- 1. TABLA PRINCIPAL (embarques_core)
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
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Índices para mejorar rendimiento
    INDEX idx_embarques_folio (folio),
    INDEX idx_embarques_cliente (cliente_id),
    INDEX idx_embarques_operador (operador_id),
    INDEX idx_embarques_estado (estado),
    INDEX idx_embarques_fecha (fecha_creacion)
);

-- 2. TABLA DE DETALLES LOGÍSTICOS (embarques_logistica)
-- Información específica de recolecta/entrega
CREATE TABLE IF NOT EXISTS embarques_logistica (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID REFERENCES embarques_core(id) ON DELETE CASCADE,
    
    -- Recolecta
    lugar_recolecta VARCHAR(200),
    direccion_recolecta TEXT,
    fecha_recolecta DATE,
    hora_recolecta TIME,
    tiempo_recolecta VARCHAR(50),
    
    -- Entrega
    direccion_entrega TEXT,
    fecha_entrega TIMESTAMP,
    hora_entrega TIME,
    tiempo_entrega VARCHAR(50),
    
    -- Documentación
    carta_porte VARCHAR(100),
    load_number VARCHAR(100),
    
    -- Aduanas (para embarques internacionales)
    patente_agente_aduanal VARCHAR(100),
    aduana_cruce VARCHAR(100),
    dueno_mercancia VARCHAR(200),
    
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(embarque_id) -- 1:1 con embarques_core
);

-- 3. TABLA DE SERVICIOS Y PRECIOS (embarques_servicios)
-- Información comercial y de servicios
CREATE TABLE IF NOT EXISTS embarques_servicios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID REFERENCES embarques_core(id) ON DELETE CASCADE,
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
    
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(embarque_id) -- 1:1 con embarques_core
);

-- 4. TABLA DE FACTURACIÓN (embarques_facturacion)
-- Estados y control de facturación
CREATE TABLE IF NOT EXISTS embarques_facturacion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID REFERENCES embarques_core(id) ON DELETE CASCADE,
    
    -- Estado de facturación
    estado_facturacion VARCHAR(50) DEFAULT 'pendiente_facturacion',
    
    -- Archivado
    fecha_archivado TIMESTAMP WITH TIME ZONE,
    usuario_archivo VARCHAR(255),
    motivo_archivo TEXT,
    observaciones_archivo TEXT,
    
    -- Cancelación
    fecha_cancelacion TIMESTAMPTZ,
    cancelado_por VARCHAR(255),
    motivo_cancelacion TEXT,
    
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(embarque_id), -- 1:1 con embarques_core
    INDEX idx_facturacion_estado (estado_facturacion)
);

-- 5. TABLA DE ENVÍOS AL CLIENTE (embarques_envios_cliente)
-- Historial de comunicaciones/envíos al cliente
CREATE TABLE IF NOT EXISTS embarques_envios_cliente (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID REFERENCES embarques_core(id) ON DELETE CASCADE,
    
    numero_envio INTEGER NOT NULL, -- 1, 2, 3, 4...
    fecha_envio TIMESTAMP NOT NULL,
    tipo_envio VARCHAR(50), -- 'factura', 'documento', 'seguimiento', etc.
    observaciones TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_envios_embarque (embarque_id),
    INDEX idx_envios_fecha (fecha_envio)
);

-- 6. TABLA DE PAGOS (embarques_pagos)
-- Historial de pagos recibidos
CREATE TABLE IF NOT EXISTS embarques_pagos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID REFERENCES embarques_core(id) ON DELETE CASCADE,
    
    numero_pago INTEGER NOT NULL, -- 1, 2, 3, 4...
    fecha_pago DATE NOT NULL,
    referencia_pago VARCHAR(100),
    monto_pago DECIMAL(12,2),
    moneda VARCHAR(3) DEFAULT 'MXN',
    metodo_pago VARCHAR(50), -- 'transferencia', 'cheque', 'efectivo', etc.
    banco VARCHAR(100),
    observaciones TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_pagos_embarque (embarque_id),
    INDEX idx_pagos_fecha (fecha_pago),
    INDEX idx_pagos_referencia (referencia_pago)
);

-- 7. TABLA DE OBSERVACIONES Y NOTAS (embarques_observaciones)
-- Historial de observaciones/comentarios
CREATE TABLE IF NOT EXISTS embarques_observaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID REFERENCES embarques_core(id) ON DELETE CASCADE,
    
    tipo_observacion VARCHAR(50), -- 'general', 'operador', 'cliente', 'interno'
    observacion TEXT NOT NULL,
    usuario_creacion VARCHAR(100),
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_observaciones_embarque (embarque_id),
    INDEX idx_observaciones_fecha (fecha_creacion)
);

-- 8. TABLA DE REPRESENTANTES DE CLIENTE (embarques_representantes)
-- Información de representantes específicos por embarque
CREATE TABLE IF NOT EXISTS embarques_representantes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    embarque_id UUID REFERENCES embarques_core(id) ON DELETE CASCADE,
    
    representante_cliente_id UUID, -- Puede referenciar a una tabla de contactos
    info_representante JSONB, -- Información flexible en JSON
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(embarque_id) -- 1:1 con embarques_core
);

-- =================================================================
-- VISTAS PARA COMPATIBILIDAD CON CÓDIGO EXISTENTE
-- =================================================================

-- Vista completa que simula la tabla original
CREATE OR REPLACE VIEW embarques AS
SELECT 
    ec.id,
    ec.folio,
    ec.cliente_id,
    ec.operador_id,
    ec.camion_id,
    ec.remolque_id,
    ec.origen,
    ec.destino,
    ec.contenido,
    ec.peso,
    ec.estado,
    ec.fecha_creacion,
    ec.updated_at,
    
    -- Logística
    el.lugar_recolecta,
    el.direccion_recolecta,
    el.fecha_recolecta,
    el.hora_recolecta,
    el.tiempo_recolecta,
    el.direccion_entrega,
    el.fecha_entrega,
    el.hora_entrega,
    el.tiempo_entrega,
    el.carta_porte,
    el.load_number,
    el.patente_agente_aduanal,
    el.aduana_cruce,
    el.dueno_mercancia,
    
    -- Servicios
    es.tipo_servicio_id,
    es.precio_flete,
    es.moneda_flete,
    es.quickpaid_enabled,
    es.quickpaid_percent,
    es.quickpaid_descuento,
    es.precio_quickpaid,
    es.flete_falso,
    es.modificado,
    es.pago_operador,
    
    -- Facturación
    ef.estado_facturacion,
    ef.fecha_archivado,
    ef.usuario_archivo,
    ef.motivo_archivo,
    ef.observaciones_archivo,
    ef.fecha_cancelacion,
    ef.cancelado_por,
    ef.motivo_cancelacion,
    
    -- Representante
    er.representante_cliente_id as representante_cliente,
    er.info_representante

FROM embarques_core ec
LEFT JOIN embarques_logistica el ON ec.id = el.embarque_id
LEFT JOIN embarques_servicios es ON ec.id = es.embarque_id
LEFT JOIN embarques_facturacion ef ON ec.id = ef.embarque_id
LEFT JOIN embarques_representantes er ON ec.id = er.embarque_id;

-- =================================================================
-- FUNCIONES DE MIGRACIÓN
-- =================================================================

-- Función para migrar datos de la tabla actual a las nuevas tablas
CREATE OR REPLACE FUNCTION migrar_embarques_normalizados()
RETURNS INTEGER AS $$
DECLARE
    total_migrated INTEGER := 0;
    embarque_record RECORD;
BEGIN
    -- Migrar cada embarque de la tabla original
    FOR embarque_record IN 
        SELECT * FROM embarques_original  -- Renombrar la tabla actual antes de ejecutar
    LOOP
        -- Insertar en embarques_core
        INSERT INTO embarques_core (
            id, folio, cliente_id, operador_id, camion_id, remolque_id,
            origen, destino, contenido, peso, estado, fecha_creacion, updated_at
        ) VALUES (
            embarque_record.id,
            embarque_record.folio,
            embarque_record.cliente_id,
            embarque_record.operador_id,
            embarque_record.camion_id,
            embarque_record.remolque_id,
            embarque_record.origen,
            embarque_record.destino,
            embarque_record.contenido,
            embarque_record.peso,
            embarque_record.estado,
            embarque_record.fecha_creacion,
            embarque_record.updated_at
        );
        
        -- Insertar en embarques_logistica (si tiene datos logísticos)
        IF embarque_record.lugar_recolecta IS NOT NULL OR 
           embarque_record.fecha_recolecta IS NOT NULL THEN
            INSERT INTO embarques_logistica (
                embarque_id, lugar_recolecta, direccion_recolecta,
                fecha_recolecta, hora_recolecta, tiempo_recolecta,
                direccion_entrega, fecha_entrega, hora_entrega, tiempo_entrega,
                carta_porte, load_number, patente_agente_aduanal,
                aduana_cruce, dueno_mercancia
            ) VALUES (
                embarque_record.id,
                embarque_record.lugar_recolecta,
                embarque_record.direccion_recolecta,
                embarque_record.fecha_recolecta,
                embarque_record.hora_recolecta,
                embarque_record.tiempo_recolecta,
                embarque_record.direccion_entrega,
                embarque_record.fecha_entrega,
                embarque_record.hora_entrega,
                embarque_record.tiempo_entrega,
                embarque_record.carta_porte,
                embarque_record.load_number,
                embarque_record.patente_agente_aduanal,
                embarque_record.aduana_cruce,
                embarque_record.dueno_mercancia
            );
        END IF;
        
        -- Insertar en embarques_servicios (si tiene datos de servicios)
        IF embarque_record.tipo_servicio_id IS NOT NULL OR 
           embarque_record.precio_flete IS NOT NULL THEN
            INSERT INTO embarques_servicios (
                embarque_id, tipo_servicio_id, precio_flete, moneda_flete,
                quickpaid_enabled, quickpaid_percent, quickpaid_descuento,
                precio_quickpaid, flete_falso, modificado, pago_operador
            ) VALUES (
                embarque_record.id,
                embarque_record.tipo_servicio_id,
                embarque_record.precio_flete,
                COALESCE(embarque_record.moneda_flete, embarque_record.currency, 'MXN'),
                COALESCE(embarque_record.quickpaid_enabled, FALSE),
                embarque_record.quickpaid_percent,
                embarque_record.quickpaid_descuento,
                embarque_record.precio_quickpaid,
                COALESCE(embarque_record.flete_falso, FALSE),
                COALESCE(embarque_record.modificado, FALSE),
                embarque_record.pago_operador
            );
        END IF;
        
        -- Insertar en embarques_facturacion (si tiene datos de facturación)
        INSERT INTO embarques_facturacion (
            embarque_id, estado_facturacion, fecha_archivado,
            usuario_archivo, motivo_archivo, observaciones_archivo,
            fecha_cancelacion, cancelado_por, motivo_cancelacion
        ) VALUES (
            embarque_record.id,
            COALESCE(embarque_record.estado_facturacion, 'pendiente_facturacion'),
            embarque_record.fecha_archivado,
            embarque_record.usuario_archivo,
            embarque_record.motivo_archivo,
            embarque_record.observaciones_archivo,
            embarque_record.fecha_cancelacion,
            embarque_record.cancelado_por,
            embarque_record.motivo_cancelacion
        );
        
        -- Migrar envíos al cliente (fecha_envio_cliente_1 a 4)
        IF embarque_record.fecha_envio_cliente_1 IS NOT NULL THEN
            INSERT INTO embarques_envios_cliente (embarque_id, numero_envio, fecha_envio, tipo_envio)
            VALUES (embarque_record.id, 1, embarque_record.fecha_envio_cliente_1::TIMESTAMP, 'factura');
        END IF;
        -- Repetir para fecha_envio_cliente_2, 3, 4...
        
        -- Migrar pagos (fecha_pago_1 a 4 con referencia_pago_1 a 4)
        IF embarque_record.fecha_pago_1 IS NOT NULL THEN
            INSERT INTO embarques_pagos (embarque_id, numero_pago, fecha_pago, referencia_pago)
            VALUES (embarque_record.id, 1, embarque_record.fecha_pago_1::DATE, embarque_record.referencia_pago_1);
        END IF;
        -- Repetir para fecha_pago_2, 3, 4...
        
        -- Migrar observaciones generales
        IF embarque_record.observaciones IS NOT NULL AND embarque_record.observaciones != '' THEN
            INSERT INTO embarques_observaciones (embarque_id, tipo_observacion, observacion, fecha_creacion)
            VALUES (embarque_record.id, 'general', embarque_record.observaciones, embarque_record.fecha_creacion);
        END IF;
        
        -- Migrar representante
        IF embarque_record.representante_cliente IS NOT NULL OR embarque_record.info_representante IS NOT NULL THEN
            INSERT INTO embarques_representantes (embarque_id, representante_cliente_id, info_representante)
            VALUES (embarque_record.id, embarque_record.representante_cliente::UUID, embarque_record.info_representante);
        END IF;
        
        total_migrated := total_migrated + 1;
    END LOOP;
    
    RETURN total_migrated;
END;
$$ LANGUAGE plpgsql;