-- Script para corregir la tabla tipos_servicio y usar precio_base como columna principal
-- Este script asegura que la tabla tenga la estructura correcta

-- Nota: en algunas instancias, id ya es UUID. Para compatibilidad:
-- - Creamos la tabla con id UUID si no existe.
-- - En inserts usamos gen_random_uuid() y hacemos upsert por slug.
CREATE TABLE IF NOT EXISTS tipos_servicio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(100) DEFAULT 'General',
    subcategoria VARCHAR(100),
    precio_base DECIMAL(10,2) DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    orden_visualizacion INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Agregar la columna pago_operador si no existe (para pagos a operadores)
DO $$
BEGIN
    -- Asegurar columna pago_operador
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tipos_servicio' AND column_name = 'pago_operador'
    ) THEN
        ALTER TABLE tipos_servicio ADD COLUMN pago_operador DECIMAL(10,2) DEFAULT 0;
    END IF;
    -- Asegurar columna slug (para upserts idempotentes)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tipos_servicio' AND column_name = 'slug'
    ) THEN
        ALTER TABLE tipos_servicio ADD COLUMN slug TEXT;
    END IF;
    -- Asegurar índice/unique en slug
    BEGIN
        CREATE UNIQUE INDEX IF NOT EXISTS tipos_servicio_slug_key ON tipos_servicio(slug);
    EXCEPTION WHEN duplicate_table THEN
        -- ignore
        NULL;
    END;
END $$;

-- 3. Insertar o actualizar todos los tipos de servicio usando precio_base
-- Upsert por slug; id se genera con gen_random_uuid()
INSERT INTO tipos_servicio (id, slug, nombre, descripcion, categoria, subcategoria, precio_base, pago_operador, orden_visualizacion) VALUES
-- Servicios de Aduana - Exportación 240
 (gen_random_uuid(), 'exportacion-cargada-caja-seca-240', 'EXPORTACIÓN CARGADA - CAJA SECA 240', 'Servicio de exportación con contenedor de caja seca cargada - Zona 240', 'Servicios de Aduana', 'Exportación 240', 1800.00, 1800.00, 1),
 (gen_random_uuid(), 'exportacion-cargada-larmex-240', 'EXPORTACIÓN CARGADA - CAJA SECA (LARMEX) 240', 'Servicio especializado LARMEX para exportación con caja seca - Zona 240', 'Servicios de Aduana', 'Exportación 240', 2000.00, 2000.00, 2),
 (gen_random_uuid(), 'exportacion-cargada-thermo-agricultura-240', 'EXPORTACIÓN CARGADA - THERMO (AGRICULTURA) 240', 'Transporte refrigerado especializado para productos agrícolas - Zona 240', 'Servicios de Aduana', 'Exportación 240', 2300.00, 2300.00, 3),
 (gen_random_uuid(), 'exportacion-cargada-plataforma-240', 'EXPORTACIÓN CARGADA - PLATAFORMA 240', 'Plataforma especializada para carga de exportación - Zona 240', 'Servicios de Aduana', 'Exportación 240', 1900.00, 1900.00, 4),

-- Servicios de Aduana - Importación 240
 (gen_random_uuid(), 'importacion-cargada-caja-seca-240', 'IMPORTACIÓN CARGADA - CAJA SECA 240', 'Servicio de importación con contenedor de caja seca cargada - Zona 240', 'Servicios de Aduana', 'Importación 240', 1700.00, 1700.00, 5),
 (gen_random_uuid(), 'importacion-cargada-plataforma-240', 'IMPORTACIÓN CARGADA - PLATAFORMA 240', 'Plataforma de importación con carga - Zona 240', 'Servicios de Aduana', 'Importación 240', 1850.00, 1850.00, 6),
 (gen_random_uuid(), 'importacion-vacia-caja-seca-thermo-240', 'IMPORTACIÓN VACÍA - CAJA SECA/THERMO 240', 'Retorno de contenedores vacíos de caja seca o thermo - Zona 240', 'Servicios de Aduana', 'Importación 240', 1200.00, 1200.00, 7),
 (gen_random_uuid(), 'importacion-cargada-plataforma-amarre-240', 'IMPORTACIÓN CARGADA - PLATAFORMA CON AMARRE 240', 'Plataforma especializada con sistema de amarre para importación - Zona 240', 'Servicios de Aduana', 'Importación 240', 2100.00, 2100.00, 8),
 (gen_random_uuid(), 'importacion-en-tractor-240', 'IMPORTACIÓN - EN TRACTOR 240', 'Servicio de importación solo con tractocamión - Zona 240', 'Servicios de Aduana', 'Importación 240', 1000.00, 1000.00, 9),

-- Servicios de Aduana - Zona 800
 (gen_random_uuid(), 'exportacion-cargada-caja-seca-800', 'EXPORTACIÓN CARGADA - CAJA SECA 800', 'Exportación con caja seca cargada - Zona 800', 'Servicios de Aduana', 'Zona 800', 2200.00, 2200.00, 10),
 (gen_random_uuid(), 'exportacion-vacia-caja-seca-800', 'EXPORTACIÓN VACÍA - CAJA SECA 800', 'Retorno de contenedor vacío de caja seca - Zona 800', 'Servicios de Aduana', 'Zona 800', 1500.00, 1500.00, 11),
 (gen_random_uuid(), 'exportacion-en-tractor-800', 'EXPORTACIÓN - EN TRACTOR 800', 'Servicio de exportación solo con tractocamión - Zona 800', 'Servicios de Aduana', 'Zona 800', 1200.00, 1200.00, 12),
 (gen_random_uuid(), 'exportacion-cargada-plataforma-800', 'EXPORTACIÓN CARGADA - PLATAFORMA 800', 'Plataforma cargada para exportación - Zona 800', 'Servicios de Aduana', 'Zona 800', 2400.00, 2400.00, 13),
 (gen_random_uuid(), 'importacion-cargada-caja-seca-800', 'IMPORTACIÓN CARGADA - CAJA SECA 800', 'Importación con caja seca cargada - Zona 800', 'Servicios de Aduana', 'Zona 800', 2000.00, 2000.00, 14),
 (gen_random_uuid(), 'importacion-vacia-plataforma-800', 'IMPORTACIÓN VACÍA - PLATAFORMA 800', 'Plataforma vacía para importación - Zona 800', 'Servicios de Aduana', 'Zona 800', 1400.00, 1400.00, 15),

-- Servicios Adicionales
 (gen_random_uuid(), 'pagos-extras', 'PAGOS EXTRAS', 'Servicios adicionales con costo extra según requerimientos especiales', 'Servicios Adicionales', 'Extras', 300.00, 300.00, 16),
 (gen_random_uuid(), 'horas-rojo-amarillo', 'HORAS ROJO/AMARILLO', 'Servicios prestados en horarios especiales (rojo/amarillo)', 'Servicios Adicionales', 'Horarios Especiales', 500.00, 500.00, 17),
 (gen_random_uuid(), 'cargas-descargas', 'CARGAS/DESCARGAS', 'Servicios de manipulación, carga y descarga de mercancías', 'Servicios Adicionales', 'Manipulación', 400.00, 400.00, 18),
 (gen_random_uuid(), 'movimientos-en-falso', 'MOVIMIENTOS EN FALSO', 'Movimientos iniciados pero no completados por causas ajenas', 'Servicios Adicionales', 'Especiales', 250.00, 250.00, 19),
 (gen_random_uuid(), 'movimientos-locales', 'MOVIMIENTOS LOCALES', 'Traslados y movimientos dentro de la ciudad o zona local', 'Servicios Adicionales', 'Locales', 200.00, 200.00, 20),
 (gen_random_uuid(), 'otro', 'OTRO', 'Servicio personalizado según necesidades específicas del cliente', 'Servicios Adicionales', 'Personalizado', 0.00, 0.00, 21)

ON CONFLICT (slug) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    categoria = EXCLUDED.categoria,
    subcategoria = EXCLUDED.subcategoria,
    precio_base = EXCLUDED.precio_base,
    pago_operador = EXCLUDED.pago_operador,
    orden_visualizacion = EXCLUDED.orden_visualizacion,
    updated_at = CURRENT_TIMESTAMP;

-- 4. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_tipos_servicio_precio_base ON tipos_servicio(precio_base);
CREATE INDEX IF NOT EXISTS idx_tipos_servicio_pago_operador ON tipos_servicio(pago_operador);
CREATE INDEX IF NOT EXISTS idx_tipos_servicio_activo ON tipos_servicio(activo);
CREATE INDEX IF NOT EXISTS idx_tipos_servicio_categoria ON tipos_servicio(categoria);

-- 5. Función para calcular pago automático de operador usando precio_base
CREATE OR REPLACE FUNCTION calcular_pago_operador(p_tipo_servicio_id VARCHAR, p_embarque_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    pago_base DECIMAL(10,2);
    factor_ajuste DECIMAL(10,2) := 1.0;
BEGIN
    -- Obtener el pago base del tipo de servicio (usar pago_operador si existe, sino precio_base)
    SELECT COALESCE(pago_operador, precio_base, 0) INTO pago_base
    FROM tipos_servicio 
    WHERE id = p_tipo_servicio_id AND activo = true;
    
    -- Si no se encuentra, retornar 0
    IF pago_base IS NULL THEN
        pago_base := 0;
    END IF;
    
    RETURN pago_base * factor_ajuste;
END;
$$ LANGUAGE plpgsql;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Script ejecutado exitosamente. Tabla tipos_servicio configurada correctamente.';
    RAISE NOTICE 'Se crearon % tipos de servicio con precios definidos.', 
        (SELECT COUNT(*) FROM tipos_servicio WHERE activo = true AND precio_base > 0);
END $$;
