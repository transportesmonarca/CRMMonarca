-- Monarca setup.sql (consolidado, sin datos de ejemplo)
-- Ejecuta este archivo una sola vez en un proyecto nuevo (Supabase/Postgres)
-- Cubre tablas/columnas/índices/funciones usados por la app.

-- 0) Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- uuid_generate_v4()

-- 1) Función utilitaria para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Tablas base
CREATE TABLE IF NOT EXISTS operadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  alias VARCHAR(100),
  telefono VARCHAR(15),
  email VARCHAR(100),
  licencia VARCHAR(50),
  fecha_vencimiento_licencia DATE,
  -- Apto médico
  numero_apto_medico VARCHAR(50),
  -- Campos adicionales
  fecha_vencimiento_apto_medico DATE,
  tipo_sangre VARCHAR(5),
  direccion TEXT,
  fecha_nacimiento DATE,
  curp VARCHAR(18),
  rfc VARCHAR(13),
  nss TEXT,
  telefono_emergencia VARCHAR(15),
  contactos_emergencia TEXT, -- JSON
  documentos TEXT,           -- JSON
  observaciones TEXT,
  numero_visa VARCHAR(50),
  fecha_vencimiento_visa DATE,
  numero_fast VARCHAR(50),
  fecha_vencimiento_fast DATE,
  estado VARCHAR(20) DEFAULT 'activo',
  fecha_registro TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Garantizar columna si la tabla ya existía sin ella
ALTER TABLE operadores 
  ADD COLUMN IF NOT EXISTS numero_apto_medico VARCHAR(50);

CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  empresa VARCHAR(100),
  telefono VARCHAR(15),
  email VARCHAR(100),
  direccion TEXT,
  rfc VARCHAR(20),
  -- Facturación preferida
  forma_facturacion VARCHAR(50),
  divisa_pago VARCHAR(3) CHECK (divisa_pago IN ('MXN','USD')),
  empresa_facturadora VARCHAR(50) CHECK (empresa_facturadora IN ('JOSE_FERNANDO_CABARJO','MONARCH_INTERNATIONAL')),
  estado VARCHAR(20) DEFAULT 'activo',
  fecha_registro TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS camiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_economico VARCHAR(20) NOT NULL UNIQUE,
  marca VARCHAR(50),
  modelo VARCHAR(50),
  año INTEGER,
  placas VARCHAR(20),
  numero_serie VARCHAR(100),
  kilometraje INTEGER DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'disponible',
  observaciones TEXT,
  fecha_registro TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_camiones_numero_serie ON camiones(numero_serie);

-- Compatibilidad de importación: columnas adicionales (también reflejadas en observaciones JSON)
ALTER TABLE camiones 
  ADD COLUMN IF NOT EXISTS poliza_seguro_mexicano TEXT,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento_seguro_mexicano DATE,
  ADD COLUMN IF NOT EXISTS poliza_seguro_americano TEXT,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento_seguro_americano DATE,
  ADD COLUMN IF NOT EXISTS tag_americano TEXT,
  ADD COLUMN IF NOT EXISTS tag_mexicano TEXT,
  ADD COLUMN IF NOT EXISTS numero_base TEXT,
  ADD COLUMN IF NOT EXISTS numeros_adicionales JSONB;

-- Función/trigger para sincronizar columnas adicionales <-> JSON observaciones
CREATE OR REPLACE FUNCTION camiones_sync_observaciones()
RETURNS TRIGGER AS $$
DECLARE
  j JSONB;
  v_fecha_mex TEXT;
  v_fecha_usa TEXT;
BEGIN
  -- Observaciones a JSONB con fallback si no es JSON válido
  BEGIN
    j := COALESCE(NEW.observaciones::JSONB, '{}'::JSONB);
  EXCEPTION WHEN others THEN
    j := '{}'::JSONB;
  END;
  -- 1) Completar columnas desde JSON si vienen nulas en la fila nueva
  IF NEW.poliza_seguro_mexicano IS NULL THEN
    NEW.poliza_seguro_mexicano := j->>'poliza_seguro_mexicano';
  END IF;
  IF NEW.fecha_vencimiento_seguro_mexicano IS NULL THEN
    v_fecha_mex := NULLIF(j->>'fecha_vencimiento_seguro_mexicano','');
    IF v_fecha_mex IS NOT NULL THEN
      NEW.fecha_vencimiento_seguro_mexicano := v_fecha_mex::DATE;
    END IF;
  END IF;
  IF NEW.poliza_seguro_americano IS NULL THEN
    NEW.poliza_seguro_americano := j->>'poliza_seguro_americano';
  END IF;
  IF NEW.fecha_vencimiento_seguro_americano IS NULL THEN
    v_fecha_usa := NULLIF(j->>'fecha_vencimiento_seguro_americano','');
    IF v_fecha_usa IS NOT NULL THEN
      NEW.fecha_vencimiento_seguro_americano := v_fecha_usa::DATE;
    END IF;
  END IF;
  IF NEW.tag_americano IS NULL THEN
    NEW.tag_americano := j->>'tag_americano';
  END IF;
  IF NEW.tag_mexicano IS NULL THEN
    NEW.tag_mexicano := j->>'tag_mexicano';
  END IF;
  IF NEW.numero_base IS NULL THEN
    NEW.numero_base := j->>'numero_base';
  END IF;
  IF NEW.numeros_adicionales IS NULL THEN
    NEW.numeros_adicionales := COALESCE(j->'numeros_adicionales', '[]'::JSONB);
  END IF;

  -- 2) Reconstruir JSON observaciones con los valores finales (manteniendo otras llaves existentes)
  j := j || jsonb_strip_nulls(jsonb_build_object(
          'poliza_seguro_mexicano', NEW.poliza_seguro_mexicano,
          'fecha_vencimiento_seguro_mexicano', CASE WHEN NEW.fecha_vencimiento_seguro_mexicano IS NULL THEN NULL ELSE to_char(NEW.fecha_vencimiento_seguro_mexicano, 'YYYY-MM-DD') END,
          'poliza_seguro_americano', NEW.poliza_seguro_americano,
          'fecha_vencimiento_seguro_americano', CASE WHEN NEW.fecha_vencimiento_seguro_americano IS NULL THEN NULL ELSE to_char(NEW.fecha_vencimiento_seguro_americano, 'YYYY-MM-DD') END,
          'tag_americano', NEW.tag_americano,
          'tag_mexicano', NEW.tag_mexicano,
          'numero_base', NEW.numero_base,
          'numeros_adicionales', NEW.numeros_adicionales
        ));

  NEW.observaciones := j::TEXT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_camiones_sync_observaciones ON camiones;
CREATE TRIGGER trg_camiones_sync_observaciones
  BEFORE INSERT OR UPDATE ON camiones
  FOR EACH ROW
  EXECUTE FUNCTION camiones_sync_observaciones();

CREATE TABLE IF NOT EXISTS remolques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_economico VARCHAR(20) NOT NULL UNIQUE,
  tipo VARCHAR(50),
  capacidad DECIMAL(10,2),
  placas VARCHAR(20),
  estado VARCHAR(20) DEFAULT 'disponible',
  ubicacion VARCHAR(100),
  fecha_registro TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Campos adicionales requeridos por la app (idempotentes)
ALTER TABLE remolques 
  ADD COLUMN IF NOT EXISTS marca VARCHAR(100),
  ADD COLUMN IF NOT EXISTS modelo VARCHAR(100),
  ADD COLUMN IF NOT EXISTS año INTEGER,
  ADD COLUMN IF NOT EXISTS numero_serie VARCHAR(100),
  ADD COLUMN IF NOT EXISTS fecha_ultima_inspeccion DATE,
  ADD COLUMN IF NOT EXISTS proxima_inspeccion DATE,
  ADD COLUMN IF NOT EXISTS poliza_seguro VARCHAR(100),
  ADD COLUMN IF NOT EXISTS vigencia_seguro DATE,
  ADD COLUMN IF NOT EXISTS comentarios TEXT,
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;

-- Índices útiles
CREATE INDEX IF NOT EXISTS idx_remolques_activo ON remolques(activo);
CREATE INDEX IF NOT EXISTS idx_remolques_estado ON remolques(estado);
CREATE INDEX IF NOT EXISTS idx_remolques_marca ON remolques(marca);
CREATE INDEX IF NOT EXISTS idx_remolques_año ON remolques(año);
-- Evitar series duplicadas (permite NULL no únicos)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_remolques_numero_serie ON remolques(numero_serie) WHERE numero_serie IS NOT NULL;

CREATE TABLE IF NOT EXISTS embarques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio VARCHAR(50) NOT NULL UNIQUE,
  cliente_id UUID REFERENCES clientes(id),
  operador_id UUID REFERENCES operadores(id),
  camion_id UUID REFERENCES camiones(id),
  remolque_id UUID REFERENCES remolques(id),
  origen VARCHAR(200) NOT NULL,
  destino VARCHAR(200) NOT NULL,
  lugar_recolecta VARCHAR(200),
  fecha_recolecta DATE,
  hora_recolecta TIME,
  contenido TEXT,
  peso DECIMAL(10,2),
  estado VARCHAR(30) DEFAULT 'creado',
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  fecha_entrega TIMESTAMP,
  observaciones TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recordatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  fecha_vencimiento DATE NOT NULL,
  tipo VARCHAR(50),
  prioridad VARCHAR(20) DEFAULT 'media',
  estado VARCHAR(20) DEFAULT 'pendiente',
  operador_id UUID REFERENCES operadores(id),
  camion_id UUID REFERENCES camiones(id),
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fotos_embarques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embarque_id UUID REFERENCES embarques(id) ON DELETE CASCADE,
  nombre_archivo VARCHAR(200) NOT NULL,
  url_blob VARCHAR(500) NOT NULL,
  tamaño_bytes INTEGER,
  tipo_mime VARCHAR(50),
  fecha_subida TIMESTAMP DEFAULT NOW(),
  subido_por VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_embarques_folio ON embarques(folio);
CREATE INDEX IF NOT EXISTS idx_embarques_estado ON embarques(estado);
CREATE INDEX IF NOT EXISTS idx_embarques_fecha ON embarques(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha ON recordatorios(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_recordatorios_estado ON recordatorios(estado);
CREATE INDEX IF NOT EXISTS idx_fotos_embarque ON fotos_embarques(embarque_id);

-- Extensiones para nuevas funcionalidades del uploader (geolocalización y comentarios)
ALTER TABLE fotos_embarques
  ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS comentario TEXT;

-- 3) Complementos de embarques
ALTER TABLE embarques 
  ADD COLUMN IF NOT EXISTS carta_porte VARCHAR(100),
  ADD COLUMN IF NOT EXISTS hora_entrega TIME,
  ADD COLUMN IF NOT EXISTS direccion_recolecta TEXT,
  ADD COLUMN IF NOT EXISTS direccion_entrega TEXT,
  ADD COLUMN IF NOT EXISTS tiempo_entrega TEXT,
  ADD COLUMN IF NOT EXISTS tiempo_recolecta TEXT,
  ADD COLUMN IF NOT EXISTS load_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS patente_agente_aduanal VARCHAR(100),
  ADD COLUMN IF NOT EXISTS aduana_cruce VARCHAR(100),
  ADD COLUMN IF NOT EXISTS dueno_mercancia VARCHAR(255),
  ADD COLUMN IF NOT EXISTS representante_cliente UUID,
  ADD COLUMN IF NOT EXISTS info_representante JSONB,
  ADD COLUMN IF NOT EXISTS tipo_servicio_id UUID,
  ADD COLUMN IF NOT EXISTS precio_flete DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS moneda_flete VARCHAR(3) DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS estado_facturacion VARCHAR(50) DEFAULT 'pendiente_facturacion',
  -- QuickPaid fields y toggles
  ADD COLUMN IF NOT EXISTS quickpaid_percent NUMERIC(5,4),
  ADD COLUMN IF NOT EXISTS quickpaid_descuento NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS precio_quickpaid NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS quickpaid_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flete_falso BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fecha_archivado TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS usuario_archivo VARCHAR(255),
  ADD COLUMN IF NOT EXISTS motivo_archivo TEXT,
  ADD COLUMN IF NOT EXISTS observaciones_archivo TEXT,
  ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pagado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS observaciones_facturacion TEXT,
  ADD COLUMN IF NOT EXISTS folio_factura_1 VARCHAR(100),
  ADD COLUMN IF NOT EXISTS folio_factura_2 VARCHAR(100),
  ADD COLUMN IF NOT EXISTS folio_factura_3 VARCHAR(100),
  ADD COLUMN IF NOT EXISTS folio_factura_4 VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cantidad_final_facturada DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS fecha_finalizacion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelado_por VARCHAR(255),
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT,
  -- Campos de envío y referencia (nivel 1)
  ADD COLUMN IF NOT EXISTS fecha_envio_cliente DATE,
  ADD COLUMN IF NOT EXISTS referencia_pago TEXT,
  -- Bandera de edición en app
  ADD COLUMN IF NOT EXISTS modificado BOOLEAN DEFAULT FALSE,
  -- Por factura (hasta 4)
  ADD COLUMN IF NOT EXISTS fecha_envio_cliente_1 DATE,
  ADD COLUMN IF NOT EXISTS fecha_envio_cliente_2 DATE,
  ADD COLUMN IF NOT EXISTS fecha_envio_cliente_3 DATE,
  ADD COLUMN IF NOT EXISTS fecha_envio_cliente_4 DATE,
  ADD COLUMN IF NOT EXISTS fecha_pago_1 DATE,
  ADD COLUMN IF NOT EXISTS fecha_pago_2 DATE,
  ADD COLUMN IF NOT EXISTS fecha_pago_3 DATE,
  ADD COLUMN IF NOT EXISTS fecha_pago_4 DATE,
  ADD COLUMN IF NOT EXISTS referencia_pago_1 TEXT,
  ADD COLUMN IF NOT EXISTS referencia_pago_2 TEXT,
  ADD COLUMN IF NOT EXISTS referencia_pago_3 TEXT,
  ADD COLUMN IF NOT EXISTS referencia_pago_4 TEXT,
  ADD COLUMN IF NOT EXISTS remolque_manual BOOLEAN,
  ADD COLUMN IF NOT EXISTS remolque_numero_economico TEXT,
  ADD COLUMN IF NOT EXISTS remolque_placa TEXT;

-- Índices dependientes de columnas agregadas arriba
CREATE INDEX IF NOT EXISTS idx_embarques_estado_facturacion ON embarques(estado_facturacion);
CREATE INDEX IF NOT EXISTS idx_embarques_fecha_archivado ON embarques(fecha_archivado DESC);

-- Compatibilidad de importación: permitir slug en lugar de UUID para tipo_servicio
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS tipo_servicio_slug TEXT;

CREATE OR REPLACE FUNCTION embarques_resolver_tipo_servicio()
RETURNS TRIGGER AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Si el UUID no viene pero sí el slug, resolverlo
  IF NEW.tipo_servicio_id IS NULL AND NEW.tipo_servicio_slug IS NOT NULL THEN
    SELECT id INTO v_id
    FROM tipos_servicio
    WHERE slug = NEW.tipo_servicio_slug OR nombre ILIKE NEW.tipo_servicio_slug
    ORDER BY (slug = NEW.tipo_servicio_slug) DESC
    LIMIT 1;
    IF v_id IS NOT NULL THEN
      NEW.tipo_servicio_id := v_id;
    END IF;
  END IF;
  -- Si viene UUID pero falta slug, rellenar
  IF NEW.tipo_servicio_id IS NOT NULL AND (NEW.tipo_servicio_slug IS NULL OR NEW.tipo_servicio_slug = '') THEN
    SELECT slug INTO NEW.tipo_servicio_slug FROM tipos_servicio WHERE id = NEW.tipo_servicio_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_embarques_resolver_tipo_servicio ON embarques;
CREATE TRIGGER trg_embarques_resolver_tipo_servicio
  BEFORE INSERT OR UPDATE ON embarques
  FOR EACH ROW
  EXECUTE FUNCTION embarques_resolver_tipo_servicio();

-- 4) Catálogos y relaciones
-- 4.a) Catálogo de marcas de camiones
CREATE TABLE IF NOT EXISTS marcas_camiones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  activa BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marcas_camiones_activa ON marcas_camiones(activa);
CREATE INDEX IF NOT EXISTS idx_marcas_camiones_nombre ON marcas_camiones(nombre);

DROP TRIGGER IF EXISTS trigger_update_marcas_camiones_updated_at ON marcas_camiones;
CREATE TRIGGER trigger_update_marcas_camiones_updated_at
  BEFORE UPDATE ON marcas_camiones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4.b) Catálogo de marcas de remolques
CREATE TABLE IF NOT EXISTS marcas_remolques (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  activa BOOLEAN DEFAULT true,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marcas_remolques_nombre ON marcas_remolques(nombre);
CREATE INDEX IF NOT EXISTS idx_marcas_remolques_activa ON marcas_remolques(activa);

DROP TRIGGER IF EXISTS trigger_update_marcas_remolques_updated_at ON marcas_remolques;
CREATE TRIGGER trigger_update_marcas_remolques_updated_at
  BEFORE UPDATE ON marcas_remolques
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS representantes_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  apellidos VARCHAR(255),
  telefono VARCHAR(20),
  email VARCHAR(255),
  puesto VARCHAR(100),
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contactos_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(15),
  email VARCHAR(100),
  puesto VARCHAR(50),
  es_principal BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contactos_clientes_cliente_id ON contactos_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contactos_clientes_activo ON contactos_clientes(activo);
CREATE INDEX IF NOT EXISTS idx_contactos_clientes_principal ON contactos_clientes(es_principal);

CREATE TABLE IF NOT EXISTS tipos_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  precio_base NUMERIC(12,2) DEFAULT 0,
  categoria VARCHAR(100),
  subcategoria VARCHAR(100),
  activo BOOLEAN DEFAULT TRUE,
  orden_visualizacion INTEGER,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tipos_servicio_activo ON tipos_servicio(activo);
CREATE INDEX IF NOT EXISTS idx_tipos_servicio_categoria ON tipos_servicio(categoria);
CREATE INDEX IF NOT EXISTS idx_tipos_servicio_orden ON tipos_servicio(orden_visualizacion);

-- Compatibilidad: agregar slug legible para importaciones
ALTER TABLE tipos_servicio ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS tipos_servicio_slug_uniq ON tipos_servicio(slug) WHERE slug IS NOT NULL;
UPDATE tipos_servicio
SET slug = COALESCE(slug, lower(regexp_replace(nombre, '\\s+', '-', 'g')))
WHERE slug IS NULL;

-- Compatibilidad de importación: columna orden_display equivalente a orden_visualizacion
ALTER TABLE tipos_servicio ADD COLUMN IF NOT EXISTS orden_display INTEGER;
-- Backfill inicial
UPDATE tipos_servicio SET orden_display = COALESCE(orden_display, orden_visualizacion);

CREATE OR REPLACE FUNCTION tipos_servicio_sync_orden()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.orden_display IS NULL AND NEW.orden_visualizacion IS NOT NULL THEN
    NEW.orden_display := NEW.orden_visualizacion;
  ELSIF NEW.orden_display IS NOT NULL AND NEW.orden_visualizacion IS NULL THEN
    NEW.orden_visualizacion := NEW.orden_display;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tipos_servicio_sync_orden ON tipos_servicio;
CREATE TRIGGER trg_tipos_servicio_sync_orden
  BEFORE INSERT OR UPDATE ON tipos_servicio
  FOR EACH ROW
  EXECUTE FUNCTION tipos_servicio_sync_orden();

CREATE INDEX IF NOT EXISTS idx_tipos_servicio_orden_display ON tipos_servicio(orden_display);

-- Mantener slug sincronizado y normalizado (soporta importaciones tipo CSV)
CREATE OR REPLACE FUNCTION tipos_servicio_slugify(p TEXT)
RETURNS TEXT AS $$
DECLARE
  s TEXT;
BEGIN
  IF p IS NULL OR btrim(p) = '' THEN
    RETURN NULL;
  END IF;
  -- Reemplaza espacios por guiones y normaliza a minúsculas; recorta guiones al inicio/fin
  s := lower(regexp_replace(p, '\\s+', '-', 'g'));
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  RETURN s;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION tipos_servicio_sync_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR btrim(COALESCE(NEW.slug, '')) = '' THEN
    NEW.slug := tipos_servicio_slugify(NEW.nombre);
  ELSE
    NEW.slug := tipos_servicio_slugify(NEW.slug);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill para filas existentes que tengan slug NULL o vacío
UPDATE tipos_servicio
SET slug = tipos_servicio_slugify(nombre)
WHERE slug IS NULL OR btrim(slug) = '';

DROP TRIGGER IF EXISTS trg_tipos_servicio_sync_slug ON tipos_servicio;
CREATE TRIGGER trg_tipos_servicio_sync_slug
  BEFORE INSERT OR UPDATE ON tipos_servicio
  FOR EACH ROW
  EXECUTE FUNCTION tipos_servicio_sync_slug();

-- Vista de exportación/compatibilidad: id (slug) + columnas visibles en CSV
CREATE OR REPLACE VIEW tipos_servicio_export AS
SELECT 
  slug AS id,
  nombre,
  descripcion,
  categoria,
  subcategoria,
  precio_base,
  activo,
  orden_display,
  fecha_creacion,
  updated_at
FROM tipos_servicio;

-- Importación CSV para tipos_servicio (usa slug en columna id del CSV)
-- Tabla staging con cabeceras idénticas al CSV compartido
CREATE TABLE IF NOT EXISTS tipos_servicio_import (
  id TEXT PRIMARY KEY, -- slug del servicio
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT,
  subcategoria TEXT,
  precio_base NUMERIC(12,2),
  activo BOOLEAN,
  orden_display INTEGER,
  fecha_creacion TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Merge/UPSERT desde staging hacia tipos_servicio usando slug
CREATE OR REPLACE FUNCTION merge_tipos_servicio_from_staging()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO tipos_servicio (
    slug, nombre, descripcion, categoria, subcategoria, precio_base,
    activo, orden_display, fecha_creacion, updated_at
  )
  SELECT 
    s.id, s.nombre, s.descripcion, s.categoria, s.subcategoria, COALESCE(s.precio_base, 0),
    COALESCE(s.activo, TRUE), s.orden_display, COALESCE(s.fecha_creacion, NOW()), COALESCE(s.updated_at, NOW())
  FROM tipos_servicio_import s
  ON CONFLICT (slug) DO UPDATE SET
    nombre = COALESCE(EXCLUDED.nombre, tipos_servicio.nombre),
    descripcion = COALESCE(EXCLUDED.descripcion, tipos_servicio.descripcion),
    categoria = COALESCE(EXCLUDED.categoria, tipos_servicio.categoria),
    subcategoria = COALESCE(EXCLUDED.subcategoria, tipos_servicio.subcategoria),
    precio_base = COALESCE(EXCLUDED.precio_base, tipos_servicio.precio_base),
    activo = COALESCE(EXCLUDED.activo, tipos_servicio.activo),
    orden_display = COALESCE(EXCLUDED.orden_display, tipos_servicio.orden_display),
    orden_visualizacion = COALESCE(EXCLUDED.orden_display, tipos_servicio.orden_visualizacion),
    fecha_creacion = COALESCE(EXCLUDED.fecha_creacion, tipos_servicio.fecha_creacion),
    updated_at = COALESCE(EXCLUDED.updated_at, NOW());

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Vincular opcionalmente el tipo de servicio (sin forzar si aún no se usa)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name='embarques' AND constraint_name='fk_embarques_tipo_servicio'
  ) THEN
    ALTER TABLE embarques
      ADD CONSTRAINT fk_embarques_tipo_servicio FOREIGN KEY (tipo_servicio_id) REFERENCES tipos_servicio(id);
  END IF;
END $$;

-- 5) Créditos de clientes
CREATE TABLE IF NOT EXISTS creditos_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  limite_credito_usd DECIMAL(12,2) DEFAULT 0.00,
  activo BOOLEAN DEFAULT TRUE,
  notas_tipo_cambio TEXT,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cliente_id)
);
-- Asegurar columna MXN para compatibilidad con frontend
ALTER TABLE creditos_clientes
  ADD COLUMN IF NOT EXISTS limite_credito_mxn DECIMAL(12,2) DEFAULT 0.00;
COMMENT ON COLUMN creditos_clientes.limite_credito_usd IS 'Límite de crédito del cliente en USD';
COMMENT ON COLUMN creditos_clientes.limite_credito_mxn IS 'Límite de crédito del cliente en MXN';
CREATE INDEX IF NOT EXISTS idx_creditos_clientes_cliente_id ON creditos_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_creditos_clientes_activo ON creditos_clientes(activo);

DROP TRIGGER IF EXISTS update_creditos_clientes_updated_at ON creditos_clientes;
CREATE TRIGGER update_creditos_clientes_updated_at
  BEFORE UPDATE ON creditos_clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6) Registros de kilometraje y mantenimiento
CREATE TABLE IF NOT EXISTS registros_kilometraje (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camion_id UUID NOT NULL REFERENCES camiones(id) ON DELETE CASCADE,
  kilometraje_anterior INTEGER,
  kilometraje_agregado INTEGER,
  kilometraje_nuevo INTEGER,
  tramo_recorrido TEXT,
  fecha_viaje DATE,
  comentarios TEXT,
  fecha_registro TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_registros_kilometraje_camion_id ON registros_kilometraje(camion_id);
CREATE INDEX IF NOT EXISTS idx_registros_kilometraje_fecha_viaje ON registros_kilometraje(fecha_viaje);
CREATE INDEX IF NOT EXISTS idx_registros_kilometraje_fecha_registro ON registros_kilometraje(fecha_registro);

DROP TRIGGER IF EXISTS trigger_update_registros_kilometraje_updated_at ON registros_kilometraje;
CREATE TRIGGER trigger_update_registros_kilometraje_updated_at
  BEFORE UPDATE ON registros_kilometraje
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS registros_mantenimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camion_id UUID NOT NULL REFERENCES camiones(id) ON DELETE CASCADE,
  fecha_mantenimiento DATE,
  tipo_mantenimiento VARCHAR(100),
  detalles_mantenimiento TEXT,
  proximo_mantenimiento DATE,
  kilometraje_actual INTEGER,
  costo_mantenimiento NUMERIC(12,2),
  proveedor_servicio TEXT,
  numero_factura TEXT,
  observaciones TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_registros_mantenimiento_camion_id ON registros_mantenimiento(camion_id);
CREATE INDEX IF NOT EXISTS idx_registros_mantenimiento_fecha ON registros_mantenimiento(fecha_mantenimiento);
CREATE INDEX IF NOT EXISTS idx_registros_mantenimiento_tipo ON registros_mantenimiento(tipo_mantenimiento);
CREATE INDEX IF NOT EXISTS idx_registros_mantenimiento_proximo ON registros_mantenimiento(proximo_mantenimiento);

DROP TRIGGER IF EXISTS trigger_update_registros_mantenimiento_updated_at ON registros_mantenimiento;
CREATE TRIGGER trigger_update_registros_mantenimiento_updated_at
  BEFORE UPDATE ON registros_mantenimiento
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS registros_mantenimiento_remolques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remolque_id UUID NOT NULL REFERENCES remolques(id) ON DELETE CASCADE,
  fecha_mantenimiento DATE NOT NULL,
  tipo_mantenimiento VARCHAR(100) NOT NULL,
  detalles_mantenimiento TEXT,
  proximo_mantenimiento DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_registros_mant_remolques_remolque_id ON registros_mantenimiento_remolques(remolque_id);
CREATE INDEX IF NOT EXISTS idx_registros_mant_remolques_fecha ON registros_mantenimiento_remolques(fecha_mantenimiento);
CREATE INDEX IF NOT EXISTS idx_registros_mant_remolques_tipo ON registros_mantenimiento_remolques(tipo_mantenimiento);
CREATE INDEX IF NOT EXISTS idx_registros_mant_remolques_proximo ON registros_mantenimiento_remolques(proximo_mantenimiento);

DROP TRIGGER IF EXISTS trigger_update_registros_mantenimiento_remolques ON registros_mantenimiento_remolques;
CREATE TRIGGER trigger_update_registros_mantenimiento_remolques
  BEFORE UPDATE ON registros_mantenimiento_remolques
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7) Documentos de operadores
CREATE TABLE IF NOT EXISTS documentos_operadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID NOT NULL REFERENCES operadores(id) ON DELETE CASCADE,
  tipo_documento VARCHAR(50) NOT NULL,
  numero_documento VARCHAR(100),
  nombre_archivo VARCHAR(255) NOT NULL,
  url_blob TEXT NOT NULL,
  pathname TEXT NOT NULL,
  tamano_bytes INTEGER,
  tipo_mime VARCHAR(100),
  fecha_vencimiento DATE,
  activo BOOLEAN DEFAULT TRUE,
  notas TEXT,
  fecha_subida TIMESTAMPTZ DEFAULT NOW(),
  subido_por VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Asegurar columnas compatibles si la tabla ya existía con nombres antiguos
ALTER TABLE documentos_operadores 
  ADD COLUMN IF NOT EXISTS url_blob TEXT,
  ADD COLUMN IF NOT EXISTS pathname TEXT,
  ADD COLUMN IF NOT EXISTS tamano_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS tipo_mime VARCHAR(100),
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notas TEXT,
  ADD COLUMN IF NOT EXISTS subido_por VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_documentos_operadores_operador_id ON documentos_operadores(operador_id);
CREATE INDEX IF NOT EXISTS idx_documentos_operadores_tipo ON documentos_operadores(tipo_documento);
CREATE INDEX IF NOT EXISTS idx_documentos_operadores_fecha ON documentos_operadores(fecha_subida);
CREATE INDEX IF NOT EXISTS idx_documentos_operadores_activo ON documentos_operadores(activo);

-- Función genérica (segura) para sincronizar columna legada url_archivo desde url_blob
-- Nota: Definirla de forma global no falla aunque algunas bases no tengan la columna;
-- sólo la usaremos si la tabla tiene url_archivo y creamos el trigger condicionalmente.
CREATE OR REPLACE FUNCTION documentos_operadores_sync_legacy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.url_archivo IS NULL AND NEW.url_blob IS NOT NULL THEN
    NEW.url_archivo := NEW.url_blob;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función análoga para sincronizar columna legada pathname_archivo desde pathname
CREATE OR REPLACE FUNCTION documentos_operadores_sync_legacy_pathname()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pathname_archivo IS NULL AND NEW.pathname IS NOT NULL THEN
    NEW.pathname_archivo := NEW.pathname;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Compatibilidad con esquemas legados: si existe la columna antigua "url_archivo"
-- y tiene NOT NULL, relajarla y mantenerla sincronizada desde url_blob.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documentos_operadores' AND column_name = 'url_archivo'
  ) THEN
    -- Permitir NULL para evitar violaciones al insertar usando sólo url_blob
    BEGIN
      EXECUTE 'ALTER TABLE documentos_operadores ALTER COLUMN url_archivo DROP NOT NULL';
    EXCEPTION WHEN others THEN
      -- Ignorar si ya es NULLABLE o si el constraint no existe
      NULL;
    END;

    -- Asegurar trigger BEFORE INSERT/UPDATE
    EXECUTE 'DROP TRIGGER IF EXISTS trg_documentos_operadores_sync_legacy ON documentos_operadores';
    EXECUTE 'CREATE TRIGGER trg_documentos_operadores_sync_legacy BEFORE INSERT OR UPDATE ON documentos_operadores FOR EACH ROW EXECUTE FUNCTION documentos_operadores_sync_legacy()';

    -- Backfill puntual: si hay filas viejas con url_archivo pero sin url_blob, copiarlas
    BEGIN
      EXECUTE 'UPDATE documentos_operadores SET url_blob = url_archivo WHERE url_blob IS NULL AND url_archivo IS NOT NULL';
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END $$;

-- Compatibilidad con esquemas legados: manejar columna "pathname_archivo"
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documentos_operadores' AND column_name = 'pathname_archivo'
  ) THEN
    -- Permitir NULL para evitar violaciones al insertar usando sólo pathname moderno
    BEGIN
      EXECUTE 'ALTER TABLE documentos_operadores ALTER COLUMN pathname_archivo DROP NOT NULL';
    EXCEPTION WHEN others THEN NULL;
    END;

    -- Asegurar trigger BEFORE INSERT/UPDATE que sincronice desde pathname
    EXECUTE 'DROP TRIGGER IF EXISTS trg_documentos_operadores_sync_legacy_pathname ON documentos_operadores';
    EXECUTE 'CREATE TRIGGER trg_documentos_operadores_sync_legacy_pathname BEFORE INSERT OR UPDATE ON documentos_operadores FOR EACH ROW EXECUTE FUNCTION documentos_operadores_sync_legacy_pathname()';

    -- Backfill: copiar a columna nueva si está vacía
    BEGIN
      EXECUTE 'UPDATE documentos_operadores SET pathname = pathname_archivo WHERE pathname IS NULL AND pathname_archivo IS NOT NULL';
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;

-- 8) Auditoría de modificaciones de embarques
CREATE TABLE IF NOT EXISTS embarque_modificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embarque_id UUID NOT NULL REFERENCES embarques(id) ON DELETE CASCADE,
  fecha_modificacion TIMESTAMPTZ DEFAULT NOW(),
  razon TEXT NOT NULL,
  operador_original_id UUID REFERENCES operadores(id),
  operador_original_nombre TEXT,
  sueldo_operador_original DECIMAL(10,2),
  moneda_sueldo_operador_original VARCHAR(3) DEFAULT 'MXN',
  operador_nuevo_id UUID REFERENCES operadores(id),
  operador_nuevo_nombre TEXT,
  sueldo_operador_nuevo DECIMAL(10,2),
  moneda_sueldo_operador_nuevo VARCHAR(3) DEFAULT 'MXN',
  camion_original_id UUID REFERENCES camiones(id),
  camion_original_numero TEXT,
  camion_nuevo_id UUID REFERENCES camiones(id),
  camion_nuevo_numero TEXT,
  remolque_original_id UUID REFERENCES remolques(id),
  remolque_original_numero TEXT,
  remolque_nuevo_id UUID REFERENCES remolques(id),
  remolque_nuevo_numero TEXT,
  precio_flete_original DECIMAL(10,2),
  precio_flete_nuevo DECIMAL(10,2),
  moneda_flete_original VARCHAR(3) DEFAULT 'MXN',
  moneda_flete_nueva VARCHAR(3) DEFAULT 'MXN',
  flete_en_falso BOOLEAN DEFAULT FALSE,
  usuario_modificacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_embarque_modificaciones_embarque_id ON embarque_modificaciones(embarque_id);
CREATE INDEX IF NOT EXISTS idx_embarque_modificaciones_fecha ON embarque_modificaciones(fecha_modificacion);
CREATE INDEX IF NOT EXISTS idx_embarque_modificaciones_operador_original ON embarque_modificaciones(operador_original_id);
CREATE INDEX IF NOT EXISTS idx_embarque_modificaciones_operador_nuevo ON embarque_modificaciones(operador_nuevo_id);

-- 9) Confirmaciones de operador (fotos)
CREATE TABLE IF NOT EXISTS operador_confirmaciones_embarque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embarque_id UUID NOT NULL REFERENCES embarques(id) ON DELETE CASCADE,
  operador_nombre TEXT NOT NULL,
  fecha_confirmacion TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_operador_confirmaciones_embarque_id ON operador_confirmaciones_embarque(embarque_id);
CREATE INDEX IF NOT EXISTS idx_operador_confirmaciones_fecha ON operador_confirmaciones_embarque(fecha_confirmacion);

-- 10) Pagos de contingencia a operadores
CREATE TABLE IF NOT EXISTS operador_pagos_contingencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  embarque_id UUID REFERENCES embarques(id) ON DELETE CASCADE,
  operador_original_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  operador_reemplazo_id UUID REFERENCES operadores(id) ON DELETE SET NULL,
  monto_original NUMERIC(10, 2) NOT NULL,
  monto_reemplazo NUMERIC(10, 2) NOT NULL,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  registrado_por TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_operador_pagos_contingencia_embarque_id ON operador_pagos_contingencia(embarque_id);
CREATE INDEX IF NOT EXISTS idx_operador_pagos_contingencia_operador_original_id ON operador_pagos_contingencia(operador_original_id);
CREATE INDEX IF NOT EXISTS idx_operador_pagos_contingencia_operador_reemplazo_id ON operador_pagos_contingencia(operador_reemplazo_id);

DROP TRIGGER IF EXISTS set_timestamp_operador_pagos_contingencia ON operador_pagos_contingencia;
CREATE TRIGGER set_timestamp_operador_pagos_contingencia
  BEFORE UPDATE ON operador_pagos_contingencia
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 11) Secuencia para folios de embarques
CREATE TABLE IF NOT EXISTS folio_sequence (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  last_number INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12) Función para recordatorios de cumpleaños
CREATE OR REPLACE FUNCTION crear_recordatorios_cumpleanos(dias_anticipacion INTEGER DEFAULT 2)
RETURNS INTEGER AS $$
DECLARE
  operador_record RECORD;
  fecha_cumpleanos DATE;
  año_actual INTEGER;
  recordatorios_creados INTEGER := 0;
BEGIN
  año_actual := EXTRACT(YEAR FROM CURRENT_DATE);
  FOR operador_record IN 
    SELECT id, nombre, apellidos, fecha_nacimiento
    FROM operadores 
    WHERE estado = 'activo' AND fecha_nacimiento IS NOT NULL
  LOOP
    fecha_cumpleanos := DATE(año_actual || '-' || 
                              EXTRACT(MONTH FROM operador_record.fecha_nacimiento) || '-' || 
                              EXTRACT(DAY FROM operador_record.fecha_nacimiento));
    IF fecha_cumpleanos < CURRENT_DATE THEN
      fecha_cumpleanos := DATE((año_actual + 1) || '-' || 
                                EXTRACT(MONTH FROM operador_record.fecha_nacimiento) || '-' || 
                                EXTRACT(DAY FROM operador_record.fecha_nacimiento));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM recordatorios 
      WHERE operador_id = operador_record.id 
        AND tipo = 'cumpleanos'
        AND fecha_vencimiento = fecha_cumpleanos - INTERVAL '1 day' * dias_anticipacion
    ) THEN
      INSERT INTO recordatorios (
        titulo, descripcion, fecha_vencimiento, tipo, prioridad, estado, operador_id, fecha_creacion, updated_at
      ) VALUES (
        'Cumpleaños de ' || operador_record.nombre || ' ' || operador_record.apellidos,
        'Recordatorio: El ' || fecha_cumpleanos || ' es el cumpleaños de ' || operador_record.nombre || ' ' || operador_record.apellidos,
        fecha_cumpleanos - INTERVAL '1 day' * dias_anticipacion,
        'cumpleanos', 'baja', 'pendiente', operador_record.id, NOW(), NOW()
      );
      recordatorios_creados := recordatorios_creados + 1;
    END IF;
  END LOOP;
  RETURN recordatorios_creados;
END;
$$ LANGUAGE plpgsql;

-- 13) Índices/constraints adicionales y triggers
-- Operadores
CREATE INDEX IF NOT EXISTS idx_operadores_curp ON operadores(curp);
CREATE INDEX IF NOT EXISTS idx_operadores_rfc ON operadores(rfc);
CREATE INDEX IF NOT EXISTS idx_operadores_nss ON operadores(nss);
CREATE INDEX IF NOT EXISTS idx_operadores_estado ON operadores(estado);
CREATE INDEX IF NOT EXISTS idx_operadores_vencimiento_licencia ON operadores(fecha_vencimiento_licencia) WHERE fecha_vencimiento_licencia IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operadores_vencimiento_apto_medico ON operadores(fecha_vencimiento_apto_medico) WHERE fecha_vencimiento_apto_medico IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='chk_tipo_sangre'
  ) THEN
    ALTER TABLE operadores 
      ADD CONSTRAINT chk_tipo_sangre 
      CHECK (tipo_sangre IS NULL OR tipo_sangre IN ('A+','A-','B+','B-','AB+','AB-','O+','O-'));
  END IF;
END $$;

-- Quitar restricción estricta de NSS si existe (no forzar 11 dígitos)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'operadores' AND constraint_name = 'check_nss_valid'
  ) THEN
    ALTER TABLE operadores DROP CONSTRAINT check_nss_valid;
  END IF;
END $$;

-- Ampliar tipo de columna NSS si quedó como VARCHAR(11) en esquemas previos
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'operadores'
      AND column_name = 'nss'
      AND data_type IN ('character varying')
      AND character_maximum_length = 11
  ) THEN
    ALTER TABLE operadores ALTER COLUMN nss TYPE TEXT;
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_operadores_updated_at ON operadores;
CREATE TRIGGER update_operadores_updated_at
  BEFORE UPDATE ON operadores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 14) Seguridad: usuarios de la app y configuración
-- app_users
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS app_users_set_updated_at ON app_users;
CREATE TRIGGER app_users_set_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS app_users_username_idx ON app_users (username);
CREATE INDEX IF NOT EXISTS app_users_locked_until_idx ON app_users (locked_until);

-- security_settings
CREATE TABLE IF NOT EXISTS security_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  max_failed_attempts INT NOT NULL DEFAULT 5,
  lockout_minutes INT NOT NULL DEFAULT 15,
  session_timeout_minutes INT NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO security_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- RLS básico
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read users" ON app_users;
CREATE POLICY "read users" ON app_users FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS "manage users" ON app_users;
CREATE POLICY "manage users" ON app_users FOR INSERT TO anon, authenticated WITH CHECK (TRUE);

DROP POLICY IF EXISTS "update users" ON app_users;
CREATE POLICY "update users" ON app_users FOR UPDATE TO anon, authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS "read security settings" ON security_settings;
CREATE POLICY "read security settings" ON security_settings FOR SELECT TO anon, authenticated USING (TRUE);

DROP POLICY IF EXISTS "update security settings" ON security_settings;
CREATE POLICY "update security settings" ON security_settings FOR UPDATE TO anon, authenticated USING (TRUE) WITH CHECK (TRUE);

-- 15) Auditoría de acciones del sistema
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  usuario TEXT NOT NULL,
  accion TEXT NOT NULL,
  modulo TEXT NOT NULL,
  detalles TEXT NOT NULL,
  ip TEXT
);
CREATE INDEX IF NOT EXISTS audit_logs_fecha_creacion_idx ON audit_logs (fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS audit_logs_accion_idx ON audit_logs (accion);
CREATE INDEX IF NOT EXISTS audit_logs_modulo_idx ON audit_logs (modulo);

-- Compatibilidad de importación: created_at equivalente a fecha_creacion
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
-- Inicializar filas existentes
UPDATE audit_logs SET created_at = COALESCE(created_at, fecha_creacion);

CREATE OR REPLACE FUNCTION audit_logs_sync_created_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Alinear ambos campos en INSERT/UPDATE
  IF NEW.created_at IS NULL AND NEW.fecha_creacion IS NOT NULL THEN
    NEW.created_at := NEW.fecha_creacion;
  ELSIF NEW.created_at IS NOT NULL AND NEW.fecha_creacion IS NULL THEN
    NEW.fecha_creacion := NEW.created_at;
  ELSIF NEW.created_at IS NULL AND NEW.fecha_creacion IS NULL THEN
    NEW.created_at := NOW();
    NEW.fecha_creacion := NEW.created_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_sync_created_at ON audit_logs;
CREATE TRIGGER trg_audit_logs_sync_created_at
  BEFORE INSERT OR UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION audit_logs_sync_created_at();

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow insert audit logs" ON audit_logs;
CREATE POLICY "allow insert audit logs" ON audit_logs FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
DROP POLICY IF EXISTS "allow read audit logs" ON audit_logs;
CREATE POLICY "allow read audit logs" ON audit_logs FOR SELECT TO anon, authenticated USING (TRUE);

-- 16) Umbrales de alerta para vencimientos
CREATE TABLE IF NOT EXISTS alert_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo TEXT NOT NULL,
  campo TEXT NOT NULL,
  dias_rojo INTEGER NOT NULL,
  dias_amarillo INTEGER NOT NULL,
  dias_verde INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DROP TRIGGER IF EXISTS alert_thresholds_set_updated_at ON alert_thresholds;
CREATE TRIGGER alert_thresholds_set_updated_at
  BEFORE UPDATE ON alert_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_alert_thresholds_modulo_campo ON alert_thresholds(modulo, campo);

-- 17) Estados de facturación y su historial
CREATE TABLE IF NOT EXISTS estados_facturacion (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'embarques' AND constraint_name = 'chk_estado_facturacion'
  ) THEN
    ALTER TABLE embarques 
      ADD CONSTRAINT chk_estado_facturacion 
      CHECK (estado_facturacion IN ('pendiente_facturacion','facturado','pagado','archivado'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS historial_estados_facturacion (
  id SERIAL PRIMARY KEY,
  embarque_id UUID NOT NULL REFERENCES embarques(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50) NOT NULL,
  usuario VARCHAR(255) NOT NULL,
  fecha_cambio TIMESTAMPTZ DEFAULT NOW(),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_historial_estados_embarque_id ON historial_estados_facturacion(embarque_id);
CREATE INDEX IF NOT EXISTS idx_historial_estados_fecha ON historial_estados_facturacion(fecha_cambio DESC);

CREATE OR REPLACE FUNCTION registrar_cambio_estado_facturacion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado_facturacion IS DISTINCT FROM NEW.estado_facturacion THEN
    INSERT INTO historial_estados_facturacion (
      embarque_id, estado_anterior, estado_nuevo, usuario, observaciones
    ) VALUES (
      NEW.id,
      OLD.estado_facturacion,
      NEW.estado_facturacion,
      COALESCE(NEW.usuario_archivo, 'Sistema'),
      CASE WHEN NEW.estado_facturacion = 'archivado' THEN NEW.motivo_archivo ELSE NULL END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cambio_estado_facturacion ON embarques;
CREATE TRIGGER trigger_cambio_estado_facturacion
  AFTER UPDATE ON embarques
  FOR EACH ROW
  EXECUTE FUNCTION registrar_cambio_estado_facturacion();

-- 18) Staging de importación para embarques (evita fallo de UUID en CSV)
-- Permite importar CSVs donde la columna "tipo_servicio_id" venga con un slug (p. ej. "cargas-descargas").
-- 1) Tabla staging (casi igual a embarques, pero "tipo_servicio_id" es TEXT)
CREATE TABLE IF NOT EXISTS embarques_import (
  folio TEXT PRIMARY KEY,
  cliente_id UUID,
  operador_id UUID,
  camion_id UUID,
  remolque_id UUID,
  origen TEXT,
  destino TEXT,
  lugar_recolecta TEXT,
  fecha_recolecta DATE,
  hora_recolecta TIME,
  contenido TEXT,
  peso NUMERIC,
  estado TEXT,
  fecha_creacion TIMESTAMP,
  fecha_entrega TIMESTAMP,
  observaciones TEXT,
  carta_porte TEXT,
  -- Campo conflictivo: aquí aceptamos uuid o slug como TEXTO
  tipo_servicio_id TEXT,
  -- Opcional: si ya traes slug en una columna separada
  tipo_servicio_slug TEXT,
  precio_flete NUMERIC(12,2),
  moneda_flete TEXT,
  estado_facturacion TEXT,
  quickpaid_percent NUMERIC(5,4),
  quickpaid_descuento NUMERIC(12,2),
  precio_quickpaid NUMERIC(12,2),
  flete_falso BOOLEAN,
  fecha_archivado TIMESTAMPTZ,
  usuario_archivo TEXT,
  motivo_archivo TEXT,
  observaciones_facturacion TEXT,
  folio_factura_1 TEXT,
  folio_factura_2 TEXT,
  folio_factura_3 TEXT,
  folio_factura_4 TEXT,
  cantidad_final_facturada NUMERIC(12,2),
  fecha_finalizacion TIMESTAMPTZ,
  fecha_cancelacion TIMESTAMPTZ,
  cancelado_por TEXT,
  motivo_cancelacion TEXT,
  remolque_manual BOOLEAN,
  remolque_numero_economico TEXT,
  remolque_placa TEXT
);

-- 2) Helpers para resolver UUID/slug
CREATE OR REPLACE FUNCTION try_parse_uuid(p_text TEXT)
RETURNS UUID AS $$
DECLARE
  v_uuid UUID;
BEGIN
  IF p_text IS NULL OR trim(p_text) = '' THEN
    RETURN NULL;
  END IF;
  BEGIN
    v_uuid := p_text::UUID;
    RETURN v_uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION resolve_tipo_servicio_uuid(p_text TEXT, p_slug TEXT)
RETURNS UUID AS $$
DECLARE
  v_uuid UUID;
BEGIN
  -- prioridad: slug explícito
  IF p_slug IS NOT NULL AND trim(p_slug) <> '' THEN
    SELECT id INTO v_uuid FROM tipos_servicio WHERE slug = p_slug LIMIT 1;
    IF v_uuid IS NOT NULL THEN RETURN v_uuid; END IF;
  END IF;

  -- si p_text ya es UUID válido, úsalo
  v_uuid := try_parse_uuid(p_text);
  IF v_uuid IS NOT NULL THEN RETURN v_uuid; END IF;

  -- intentar por slug exacto con p_text
  IF p_text IS NOT NULL AND trim(p_text) <> '' THEN
    SELECT id INTO v_uuid FROM tipos_servicio WHERE slug = p_text LIMIT 1;
    IF v_uuid IS NOT NULL THEN RETURN v_uuid; END IF;
    -- intentar por nombre parecido
    SELECT id INTO v_uuid FROM tipos_servicio WHERE nombre ILIKE p_text LIMIT 1;
    IF v_uuid IS NOT NULL THEN RETURN v_uuid; END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3) Merge/UPSERT desde staging hacia embarques
CREATE OR REPLACE FUNCTION merge_embarques_from_staging()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO embarques (
    folio, cliente_id, operador_id, camion_id, remolque_id,
    origen, destino, lugar_recolecta, fecha_recolecta, hora_recolecta,
    contenido, peso, estado, fecha_creacion, fecha_entrega, observaciones,
    carta_porte, tipo_servicio_id, tipo_servicio_slug, precio_flete, moneda_flete,
    estado_facturacion, quickpaid_percent, quickpaid_descuento, precio_quickpaid,
    flete_falso, fecha_archivado, usuario_archivo, motivo_archivo,
    observaciones_facturacion, folio_factura_1, folio_factura_2, folio_factura_3, folio_factura_4,
    cantidad_final_facturada, fecha_finalizacion, fecha_cancelacion, cancelado_por, motivo_cancelacion,
    remolque_manual, remolque_numero_economico, remolque_placa
  )
  SELECT 
    s.folio,
    s.cliente_id, s.operador_id, s.camion_id, s.remolque_id,
    s.origen, s.destino, s.lugar_recolecta, s.fecha_recolecta, s.hora_recolecta,
    s.contenido, s.peso, COALESCE(s.estado, 'creado'), s.fecha_creacion, s.fecha_entrega, s.observaciones,
    s.carta_porte,
    resolve_tipo_servicio_uuid(s.tipo_servicio_id, s.tipo_servicio_slug) AS tipo_servicio_id,
    COALESCE(s.tipo_servicio_slug, NULLIF(s.tipo_servicio_id, '')) AS tipo_servicio_slug,
    s.precio_flete, COALESCE(s.moneda_flete, 'MXN'),
    COALESCE(s.estado_facturacion, 'pendiente_facturacion'), s.quickpaid_percent, s.quickpaid_descuento, s.precio_quickpaid,
    s.flete_falso, s.fecha_archivado, s.usuario_archivo, s.motivo_archivo,
    s.observaciones_facturacion, s.folio_factura_1, s.folio_factura_2, s.folio_factura_3, s.folio_factura_4,
    s.cantidad_final_facturada, s.fecha_finalizacion, s.fecha_cancelacion, s.cancelado_por, s.motivo_cancelacion,
    s.remolque_manual, s.remolque_numero_economico, s.remolque_placa
  FROM embarques_import s
  ON CONFLICT (folio) DO UPDATE SET
    cliente_id = COALESCE(EXCLUDED.cliente_id, embarques.cliente_id),
    operador_id = COALESCE(EXCLUDED.operador_id, embarques.operador_id),
    camion_id = COALESCE(EXCLUDED.camion_id, embarques.camion_id),
    remolque_id = COALESCE(EXCLUDED.remolque_id, embarques.remolque_id),
    origen = COALESCE(EXCLUDED.origen, embarques.origen),
    destino = COALESCE(EXCLUDED.destino, embarques.destino),
    lugar_recolecta = COALESCE(EXCLUDED.lugar_recolecta, embarques.lugar_recolecta),
    fecha_recolecta = COALESCE(EXCLUDED.fecha_recolecta, embarques.fecha_recolecta),
    hora_recolecta = COALESCE(EXCLUDED.hora_recolecta, embarques.hora_recolecta),
    contenido = COALESCE(EXCLUDED.contenido, embarques.contenido),
    peso = COALESCE(EXCLUDED.peso, embarques.peso),
    estado = COALESCE(EXCLUDED.estado, embarques.estado),
    fecha_creacion = COALESCE(EXCLUDED.fecha_creacion, embarques.fecha_creacion),
    fecha_entrega = COALESCE(EXCLUDED.fecha_entrega, embarques.fecha_entrega),
    observaciones = COALESCE(EXCLUDED.observaciones, embarques.observaciones),
    carta_porte = COALESCE(EXCLUDED.carta_porte, embarques.carta_porte),
    tipo_servicio_id = COALESCE(EXCLUDED.tipo_servicio_id, embarques.tipo_servicio_id),
    tipo_servicio_slug = COALESCE(EXCLUDED.tipo_servicio_slug, embarques.tipo_servicio_slug),
    precio_flete = COALESCE(EXCLUDED.precio_flete, embarques.precio_flete),
    moneda_flete = COALESCE(EXCLUDED.moneda_flete, embarques.moneda_flete),
    estado_facturacion = COALESCE(EXCLUDED.estado_facturacion, embarques.estado_facturacion),
    quickpaid_percent = COALESCE(EXCLUDED.quickpaid_percent, embarques.quickpaid_percent),
    quickpaid_descuento = COALESCE(EXCLUDED.quickpaid_descuento, embarques.quickpaid_descuento),
    precio_quickpaid = COALESCE(EXCLUDED.precio_quickpaid, embarques.precio_quickpaid),
    flete_falso = COALESCE(EXCLUDED.flete_falso, embarques.flete_falso),
    fecha_archivado = COALESCE(EXCLUDED.fecha_archivado, embarques.fecha_archivado),
    usuario_archivo = COALESCE(EXCLUDED.usuario_archivo, embarques.usuario_archivo),
    motivo_archivo = COALESCE(EXCLUDED.motivo_archivo, embarques.motivo_archivo),
    observaciones_facturacion = COALESCE(EXCLUDED.observaciones_facturacion, embarques.observaciones_facturacion),
    folio_factura_1 = COALESCE(EXCLUDED.folio_factura_1, embarques.folio_factura_1),
    folio_factura_2 = COALESCE(EXCLUDED.folio_factura_2, embarques.folio_factura_2),
    folio_factura_3 = COALESCE(EXCLUDED.folio_factura_3, embarques.folio_factura_3),
    folio_factura_4 = COALESCE(EXCLUDED.folio_factura_4, embarques.folio_factura_4),
    cantidad_final_facturada = COALESCE(EXCLUDED.cantidad_final_facturada, embarques.cantidad_final_facturada),
    fecha_finalizacion = COALESCE(EXCLUDED.fecha_finalizacion, embarques.fecha_finalizacion),
    fecha_cancelacion = COALESCE(EXCLUDED.fecha_cancelacion, embarques.fecha_cancelacion),
    cancelado_por = COALESCE(EXCLUDED.cancelado_por, embarques.cancelado_por),
    motivo_cancelacion = COALESCE(EXCLUDED.motivo_cancelacion, embarques.motivo_cancelacion),
    remolque_manual = COALESCE(EXCLUDED.remolque_manual, embarques.remolque_manual),
    remolque_numero_economico = COALESCE(EXCLUDED.remolque_numero_economico, embarques.remolque_numero_economico),
    remolque_placa = COALESCE(EXCLUDED.remolque_placa, embarques.remolque_placa)
  ;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Listo
DO $$ BEGIN RAISE NOTICE '=== Monarca setup.sql ejecutado (sin datos de ejemplo). ==='; END $$;
