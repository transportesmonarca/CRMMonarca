-- =================================================================
-- SCRIPT DE MIGRACIÓN COMPLETA: NORMALIZACIÓN TABLA EMBARQUES  
-- Fecha: 23 de septiembre de 2025
-- Propósito: Dividir la tabla monolítica embarques en tablas especializadas
-- =================================================================

-- ⚠️  IMPORTANTE: EJECUTAR ESTE SCRIPT PASO A PASO, NO TODO DE UNA VEZ
-- Verificar cada sección antes de continuar con la siguiente

BEGIN;

-- =================================================================
-- PASO 1: CREAR NUEVAS TABLAS NORMALIZADAS
-- =================================================================

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
    tipo_servicio_id TEXT REFERENCES tipos_servicio(id),
    
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

COMMIT;

-- =================================================================
-- PASO 2: FUNCIÓN DE MIGRACIÓN DE DATOS
-- =================================================================

BEGIN;

CREATE OR REPLACE FUNCTION migrar_datos_embarques_normalizados()
RETURNS TABLE(
    total_migrados INTEGER,
    total_logistica INTEGER,
    total_servicios INTEGER,
    total_facturacion INTEGER,
    total_envios INTEGER,
    total_pagos INTEGER,
    total_observaciones INTEGER,
    total_representantes INTEGER
) AS $$
DECLARE
    contador_migrados INTEGER := 0;
    contador_logistica INTEGER := 0;
    contador_servicios INTEGER := 0;
    contador_facturacion INTEGER := 0;
    contador_envios INTEGER := 0;
    contador_pagos INTEGER := 0;
    contador_observaciones INTEGER := 0;
    contador_representantes INTEGER := 0;
    embarque_record RECORD;
BEGIN
    RAISE NOTICE 'Iniciando migración de datos...';
    
    -- Migrar cada embarque de la tabla original
    FOR embarque_record IN 
        SELECT * FROM embarques ORDER BY fecha_creacion
    LOOP
        -- 1. Insertar en embarques_core
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
        ) ON CONFLICT (id) DO NOTHING;
        
        contador_migrados := contador_migrados + 1;
        
        -- 2. Insertar en embarques_logistica (siempre insertar, aunque sea vacío)
        INSERT INTO embarques_logistica (
            embarque_id, lugar_recolecta, direccion_recolecta,
            fecha_recolecta, hora_recolecta, tiempo_recolecta,
            direccion_entrega, fecha_entrega, hora_entrega, tiempo_entrega,
            carta_porte, load_number, patente_agente_aduanal,
            aduana_cruce, dueno_mercancia, remolque_manual,
            remolque_numero_economico, remolque_placa
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
            embarque_record.dueno_mercancia,
            COALESCE(embarque_record.remolque_manual, FALSE),
            embarque_record.remolque_numero_economico,
            embarque_record.remolque_placa
        ) ON CONFLICT (embarque_id) DO NOTHING;
        
        contador_logistica := contador_logistica + 1;
        
        -- 3. Insertar en embarques_servicios (siempre insertar)
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
        ) ON CONFLICT (embarque_id) DO NOTHING;
        
        contador_servicios := contador_servicios + 1;
        
        -- 4. Insertar en embarques_facturacion (siempre insertar)
        INSERT INTO embarques_facturacion (
            embarque_id, estado_facturacion, fecha_archivado,
            usuario_archivo, motivo_archivo, observaciones_archivo,
            fecha_cancelacion, cancelado_por, motivo_cancelacion, fecha_finalizacion
        ) VALUES (
            embarque_record.id,
            COALESCE(embarque_record.estado_facturacion, 'pendiente_facturacion'),
            embarque_record.fecha_archivado,
            embarque_record.usuario_archivo,
            embarque_record.motivo_archivo,
            embarque_record.observaciones_archivo,
            embarque_record.fecha_cancelacion,
            embarque_record.cancelado_por,
            embarque_record.motivo_cancelacion,
            embarque_record.fecha_finalizacion
        ) ON CONFLICT (embarque_id) DO NOTHING;
        
        contador_facturacion := contador_facturacion + 1;
        
        -- 5. Migrar envíos al cliente (convertir columnas en filas)
        -- fecha_envio_cliente (genérico)
        IF embarque_record.fecha_envio_cliente IS NOT NULL THEN
            INSERT INTO embarques_envios_cliente (embarque_id, numero_envio, fecha_envio, tipo_envio)
            VALUES (embarque_record.id, 0, embarque_record.fecha_envio_cliente::TIMESTAMP WITH TIME ZONE, 'general')
            ON CONFLICT (embarque_id, numero_envio) DO NOTHING;
            contador_envios := contador_envios + 1;
        END IF;
        
        -- fecha_envio_cliente_1 a 4
        IF embarque_record.fecha_envio_cliente_1 IS NOT NULL THEN
            INSERT INTO embarques_envios_cliente (embarque_id, numero_envio, fecha_envio, tipo_envio)
            VALUES (embarque_record.id, 1, embarque_record.fecha_envio_cliente_1::TIMESTAMP WITH TIME ZONE, 'factura')
            ON CONFLICT (embarque_id, numero_envio) DO NOTHING;
            contador_envios := contador_envios + 1;
        END IF;
        
        IF embarque_record.fecha_envio_cliente_2 IS NOT NULL THEN
            INSERT INTO embarques_envios_cliente (embarque_id, numero_envio, fecha_envio, tipo_envio)
            VALUES (embarque_record.id, 2, embarque_record.fecha_envio_cliente_2::TIMESTAMP WITH TIME ZONE, 'seguimiento')
            ON CONFLICT (embarque_id, numero_envio) DO NOTHING;
            contador_envios := contador_envios + 1;
        END IF;
        
        IF embarque_record.fecha_envio_cliente_3 IS NOT NULL THEN
            INSERT INTO embarques_envios_cliente (embarque_id, numero_envio, fecha_envio, tipo_envio)
            VALUES (embarque_record.id, 3, embarque_record.fecha_envio_cliente_3::TIMESTAMP WITH TIME ZONE, 'recordatorio')
            ON CONFLICT (embarque_id, numero_envio) DO NOTHING;
            contador_envios := contador_envios + 1;
        END IF;
        
        IF embarque_record.fecha_envio_cliente_4 IS NOT NULL THEN
            INSERT INTO embarques_envios_cliente (embarque_id, numero_envio, fecha_envio, tipo_envio)
            VALUES (embarque_record.id, 4, embarque_record.fecha_envio_cliente_4::TIMESTAMP WITH TIME ZONE, 'final')
            ON CONFLICT (embarque_id, numero_envio) DO NOTHING;
            contador_envios := contador_envios + 1;
        END IF;
        
        -- 6. Migrar pagos (convertir columnas en filas)
        -- referencia_pago genérico
        IF embarque_record.referencia_pago IS NOT NULL THEN
            INSERT INTO embarques_pagos (embarque_id, numero_pago, fecha_pago, referencia_pago)
            VALUES (embarque_record.id, 0, COALESCE(embarque_record.fecha_pago_1, CURRENT_DATE), embarque_record.referencia_pago)
            ON CONFLICT (embarque_id, numero_pago) DO NOTHING;
            contador_pagos := contador_pagos + 1;
        END IF;
        
        -- fecha_pago_1 con referencia_pago_1
        IF embarque_record.fecha_pago_1 IS NOT NULL THEN
            INSERT INTO embarques_pagos (embarque_id, numero_pago, fecha_pago, referencia_pago)
            VALUES (embarque_record.id, 1, embarque_record.fecha_pago_1::DATE, embarque_record.referencia_pago_1)
            ON CONFLICT (embarque_id, numero_pago) DO NOTHING;
            contador_pagos := contador_pagos + 1;
        END IF;
        
        IF embarque_record.fecha_pago_2 IS NOT NULL THEN
            INSERT INTO embarques_pagos (embarque_id, numero_pago, fecha_pago, referencia_pago)
            VALUES (embarque_record.id, 2, embarque_record.fecha_pago_2::DATE, embarque_record.referencia_pago_2)
            ON CONFLICT (embarque_id, numero_pago) DO NOTHING;
            contador_pagos := contador_pagos + 1;
        END IF;
        
        IF embarque_record.fecha_pago_3 IS NOT NULL THEN
            INSERT INTO embarques_pagos (embarque_id, numero_pago, fecha_pago, referencia_pago)
            VALUES (embarque_record.id, 3, embarque_record.fecha_pago_3::DATE, embarque_record.referencia_pago_3)
            ON CONFLICT (embarque_id, numero_pago) DO NOTHING;
            contador_pagos := contador_pagos + 1;
        END IF;
        
        IF embarque_record.fecha_pago_4 IS NOT NULL THEN
            INSERT INTO embarques_pagos (embarque_id, numero_pago, fecha_pago, referencia_pago)
            VALUES (embarque_record.id, 4, embarque_record.fecha_pago_4::DATE, embarque_record.referencia_pago_4)
            ON CONFLICT (embarque_id, numero_pago) DO NOTHING;
            contador_pagos := contador_pagos + 1;
        END IF;
        
        -- 7. Migrar observaciones generales
        IF embarque_record.observaciones IS NOT NULL AND TRIM(embarque_record.observaciones) != '' THEN
            INSERT INTO embarques_observaciones (embarque_id, tipo_observacion, observacion, usuario_creacion, fecha_creacion)
            VALUES (embarque_record.id, 'general', embarque_record.observaciones, 'sistema_migracion', embarque_record.fecha_creacion);
            contador_observaciones := contador_observaciones + 1;
        END IF;
        
        -- 8. Migrar representante
        IF embarque_record.representante_cliente IS NOT NULL OR embarque_record.info_representante IS NOT NULL THEN
            INSERT INTO embarques_representantes (embarque_id, representante_cliente_id, info_representante)
            VALUES (
                embarque_record.id, 
                CASE 
                    WHEN embarque_record.representante_cliente ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                    THEN embarque_record.representante_cliente::UUID 
                    ELSE NULL 
                END,
                embarque_record.info_representante
            ) ON CONFLICT (embarque_id) DO NOTHING;
            contador_representantes := contador_representantes + 1;
        END IF;
        
        -- Mostrar progreso cada 100 registros
        IF contador_migrados % 100 = 0 THEN
            RAISE NOTICE 'Migrados % embarques...', contador_migrados;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migración completada. Total embarques: %', contador_migrados;
    
    RETURN QUERY SELECT 
        contador_migrados,
        contador_logistica,
        contador_servicios,
        contador_facturacion,
        contador_envios,
        contador_pagos,
        contador_observaciones,
        contador_representantes;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =================================================================
-- PASO 3: VISTA DE COMPATIBILIDAD
-- =================================================================

BEGIN;

-- Vista completa que simula la tabla original para mantener compatibilidad
CREATE OR REPLACE VIEW embarques_vista_completa AS
SELECT 
    -- Core fields
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
    el.remolque_manual,
    el.remolque_numero_economico,
    el.remolque_placa,
    
    -- Servicios
    es.tipo_servicio_id,
    es.precio_flete,
    es.moneda_flete,
    es.moneda_flete as currency, -- Alias para compatibilidad
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
    ef.fecha_finalizacion,
    
    -- Representante
    er.representante_cliente_id::TEXT as representante_cliente,
    er.info_representante,
    
    -- Envíos (campos legacy - se toman los primeros registros de cada tipo)
    env0.fecha_envio as fecha_envio_cliente,
    env1.fecha_envio as fecha_envio_cliente_1,
    env2.fecha_envio as fecha_envio_cliente_2,
    env3.fecha_envio as fecha_envio_cliente_3,
    env4.fecha_envio as fecha_envio_cliente_4,
    
    -- Pagos (campos legacy - se toman los primeros registros)
    pag0.referencia_pago as referencia_pago,
    pag1.fecha_pago as fecha_pago_1,
    pag1.referencia_pago as referencia_pago_1,
    pag2.fecha_pago as fecha_pago_2,
    pag2.referencia_pago as referencia_pago_2,
    pag3.fecha_pago as fecha_pago_3,
    pag3.referencia_pago as referencia_pago_3,
    pag4.fecha_pago as fecha_pago_4,
    pag4.referencia_pago as referencia_pago_4,
    
    -- Observaciones (tomar la primera observación general)
    obs.observacion as observaciones

FROM embarques_core ec
LEFT JOIN embarques_logistica el ON ec.id = el.embarque_id
LEFT JOIN embarques_servicios es ON ec.id = es.embarque_id
LEFT JOIN embarques_facturacion ef ON ec.id = ef.embarque_id
LEFT JOIN embarques_representantes er ON ec.id = er.embarque_id

-- Envíos (LEFT JOIN para cada número de envío)
LEFT JOIN embarques_envios_cliente env0 ON ec.id = env0.embarque_id AND env0.numero_envio = 0
LEFT JOIN embarques_envios_cliente env1 ON ec.id = env1.embarque_id AND env1.numero_envio = 1
LEFT JOIN embarques_envios_cliente env2 ON ec.id = env2.embarque_id AND env2.numero_envio = 2
LEFT JOIN embarques_envios_cliente env3 ON ec.id = env3.embarque_id AND env3.numero_envio = 3
LEFT JOIN embarques_envios_cliente env4 ON ec.id = env4.embarque_id AND env4.numero_envio = 4

-- Pagos (LEFT JOIN para cada número de pago)
LEFT JOIN embarques_pagos pag0 ON ec.id = pag0.embarque_id AND pag0.numero_pago = 0
LEFT JOIN embarques_pagos pag1 ON ec.id = pag1.embarque_id AND pag1.numero_pago = 1
LEFT JOIN embarques_pagos pag2 ON ec.id = pag2.embarque_id AND pag2.numero_pago = 2
LEFT JOIN embarques_pagos pag3 ON ec.id = pag3.embarque_id AND pag3.numero_pago = 3
LEFT JOIN embarques_pagos pag4 ON ec.id = pag4.embarque_id AND pag4.numero_pago = 4

-- Observaciones (tomar la primera observación general)
LEFT JOIN LATERAL (
    SELECT observacion 
    FROM embarques_observaciones 
    WHERE embarque_id = ec.id AND tipo_observacion = 'general'
    ORDER BY fecha_creacion ASC 
    LIMIT 1
) obs ON TRUE;

COMMIT;

-- =================================================================
-- PASO 4: FUNCIONES DE VALIDACIÓN
-- =================================================================

BEGIN;

-- Función para validar la integridad de la migración
CREATE OR REPLACE FUNCTION validar_migracion_embarques()
RETURNS TABLE(
    tabla VARCHAR,
    registros_original INTEGER,
    registros_migrados INTEGER,
    diferencia INTEGER,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH validacion AS (
        SELECT 
            'embarques_core'::VARCHAR as tabla,
            (SELECT COUNT(*) FROM embarques)::INTEGER as registros_original,
            (SELECT COUNT(*) FROM embarques_core)::INTEGER as registros_migrados
        UNION ALL
        SELECT 
            'embarques_logistica'::VARCHAR,
            (SELECT COUNT(*) FROM embarques)::INTEGER,
            (SELECT COUNT(*) FROM embarques_logistica)::INTEGER
        UNION ALL
        SELECT 
            'embarques_servicios'::VARCHAR,
            (SELECT COUNT(*) FROM embarques)::INTEGER,
            (SELECT COUNT(*) FROM embarques_servicios)::INTEGER
        UNION ALL
        SELECT 
            'embarques_facturacion'::VARCHAR,
            (SELECT COUNT(*) FROM embarques)::INTEGER,
            (SELECT COUNT(*) FROM embarques_facturacion)::INTEGER
        UNION ALL
        SELECT 
            'vista_completa'::VARCHAR,
            (SELECT COUNT(*) FROM embarques)::INTEGER,
            (SELECT COUNT(*) FROM embarques_vista_completa)::INTEGER
    )
    SELECT 
        v.tabla,
        v.registros_original,
        v.registros_migrados,
        (v.registros_original - v.registros_migrados) as diferencia,
        CASE 
            WHEN v.registros_original = v.registros_migrados THEN '✅ OK'::VARCHAR
            WHEN v.registros_migrados = 0 THEN '❌ VACÍA'::VARCHAR
            ELSE '⚠️  DIFERENCIA'::VARCHAR
        END as status
    FROM validacion v;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =================================================================

COMMENT ON TABLE embarques_core IS 'Tabla principal con datos esenciales de embarques (normalizada)';
COMMENT ON TABLE embarques_logistica IS 'Información logística: direcciones, fechas, documentación';
COMMENT ON TABLE embarques_servicios IS 'Datos comerciales: precios, servicios, configuración de pagos';
COMMENT ON TABLE embarques_facturacion IS 'Control administrativo: estados, archivado, cancelación';
COMMENT ON TABLE embarques_envios_cliente IS 'Historial de comunicaciones/envíos al cliente (escalable)';
COMMENT ON TABLE embarques_pagos IS 'Historial de pagos recibidos (escalable)';
COMMENT ON TABLE embarques_observaciones IS 'Notas y comentarios con historial';
COMMENT ON TABLE embarques_representantes IS 'Información de representantes/contactos del cliente';

COMMENT ON VIEW embarques_vista_completa IS 'Vista que mantiene compatibilidad con la tabla embarques original';

-- =================================================================
-- INSTRUCCIONES DE EJECUCIÓN
-- =================================================================

/*
📋 INSTRUCCIONES DE USO:

1. BACKUP OBLIGATORIO:
   pg_dump -U usuario -h host -d database > backup_embarques_$(date +%Y%m%d).sql

2. EJECUTAR PASO A PASO:
   - Paso 1: Crear tablas (ya ejecutado automáticamente)
   - Paso 2: Ejecutar migración: SELECT * FROM migrar_datos_embarques_normalizados();
   - Paso 3: Validar: SELECT * FROM validar_migracion_embarques();
   - Paso 4: Si todo está OK, renombrar tabla original:
             ALTER TABLE embarques RENAME TO embarques_original;
             ALTER VIEW embarques_vista_completa RENAME TO embarques;

3. ROLLBACK (si es necesario):
   - DROP VIEW embarques;
   - DROP TABLE embarques_core CASCADE; (eliminará todas las tablas relacionadas)
   - ALTER TABLE embarques_original RENAME TO embarques;

4. OPTIMIZAR DESPUÉS DE MIGRACIÓN:
   - VACUUM ANALYZE embarques_core;
   - VACUUM ANALYZE embarques_logistica;
   - VACUUM ANALYZE embarques_servicios;
   - (etc. para todas las tablas)

⚠️  IMPORTANTE: No ejecutar todo de una vez. Validar cada paso.
*/