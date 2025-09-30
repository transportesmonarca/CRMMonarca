-- SCRIPT PERSONALIZADO PARA ELIMINAR LAS TABLAS ESPECÍFICAS DE TU DB
-- Basado en las tablas que veo en tu Supabase

-- =====================================================================
-- ELIMINAR TABLAS ESPECÍFICAS QUE VEO EN TU SUPABASE
-- =====================================================================

-- Tablas de modificaciones y puntos
DROP TABLE IF EXISTS embarque_modificaciones CASCADE;
DROP TABLE IF EXISTS embarque_precio_modificaciones CASCADE;
DROP TABLE IF EXISTS embarque_puntos CASCADE;

-- Tablas de sistema normalizado específicas
DROP TABLE IF EXISTS embarques_backup_migracion CASCADE;
DROP TABLE IF EXISTS embarques_core CASCADE;
DROP TABLE IF EXISTS embarques_envios_cliente CASCADE;
DROP TABLE IF EXISTS embarques_observaciones CASCADE;
DROP TABLE IF EXISTS embarques_pagos CASCADE;
DROP TABLE IF EXISTS embarques_representantes CASCADE;
DROP TABLE IF EXISTS embarques_servicios CASCADE;

-- Otras tablas relacionadas que puedas tener
DROP TABLE IF EXISTS embarques_estados CASCADE;
DROP TABLE IF EXISTS embarques_facturacion CASCADE;
DROP TABLE IF EXISTS embarques_logistica CASCADE;
DROP TABLE IF EXISTS embarques_temporal CASCADE;
DROP TABLE IF EXISTS embarques_metadata CASCADE;
DROP TABLE IF EXISTS embarques_adicional CASCADE;
DROP TABLE IF EXISTS embarques_documentos CASCADE;
DROP TABLE IF EXISTS embarques_financiero CASCADE;
DROP TABLE IF EXISTS embarques_ubicaciones CASCADE;

-- Tablas de respaldo y backup
DROP TABLE IF EXISTS embarques_backup CASCADE;
DROP TABLE IF EXISTS embarques_backup_2024 CASCADE;
DROP TABLE IF EXISTS embarques_backup_2025 CASCADE;
DROP TABLE IF EXISTS embarques_migrado CASCADE;
DROP TABLE IF EXISTS embarques_temp CASCADE;

-- Tablas de importación
DROP TABLE IF EXISTS embarques_import CASCADE;
DROP TABLE IF EXISTS embarques_staging CASCADE;
DROP TABLE IF EXISTS embarques_csv CASCADE;

-- Sistema principal normalizado (por si acaso)
DROP TABLE IF EXISTS embarques_nuevo CASCADE;
DROP TABLE IF EXISTS embarques_normalizado CASCADE;
DROP TABLE IF EXISTS embarques_completo CASCADE;
DROP TABLE IF EXISTS embarques_consolidada CASCADE;

-- =====================================================================
-- ELIMINAR VISTAS QUE PUEDAN QUEDAR
-- =====================================================================

DROP VIEW IF EXISTS embarques_completa_new CASCADE;
DROP VIEW IF EXISTS embarques_completa CASCADE;
DROP VIEW IF EXISTS vista_embarques_completa CASCADE;
DROP VIEW IF EXISTS v_embarques_completa CASCADE;
DROP VIEW IF EXISTS embarques_unificada CASCADE;
DROP VIEW IF EXISTS embarques_vista CASCADE;

-- =====================================================================
-- VERIFICACIÓN INMEDIATA - VER QUE QUEDA
-- =====================================================================

SELECT 
    'DESPUÉS DE ELIMINACIÓN ESPECÍFICA' as resultado,
    table_name,
    table_type,
    CASE 
        WHEN table_name = 'embarques' THEN '✅ LEGACY - MANTENER'
        WHEN table_name LIKE '%embarque%' THEN '❌ AÚN EXISTE - NECESITA ELIMINACIÓN MANUAL'
        ELSE '⚪ OTRA'
    END as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%embarque%'
ORDER BY table_name;

-- =====================================================================
-- GENERAR COMANDOS ESPECÍFICOS PARA LO QUE QUEDE
-- =====================================================================

-- Generar comandos DROP específicos para cualquier tabla que quede
SELECT 
    'COMANDOS PARA TABLAS RESTANTES' as info,
    table_name,
    'DROP TABLE IF EXISTS ' || table_name || ' CASCADE;' as comando_eliminar
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%embarque%'
AND table_name != 'embarques'  -- NO eliminar la legacy
ORDER BY table_name;

-- =====================================================================
-- ASEGURAR TABLA EMBARQUES LEGACY CON TODO LO NECESARIO
-- =====================================================================

-- Agregar columnas críticas que necesitas
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS fecha_completado TIMESTAMP WITH TIME ZONE;
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMP WITH TIME ZONE;
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS fecha_finalizacion TIMESTAMP WITH TIME ZONE;
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS fecha_inicio_transito TIMESTAMP WITH TIME ZONE;
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS fecha_asignacion TIMESTAMP WITH TIME ZONE;

-- Campos de auditoría
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =====================================================================
-- CREAR ÍNDICES OPTIMIZADOS
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_embarques_estado_fecha ON embarques(estado, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_embarques_facturacion_fecha ON embarques(estado_facturacion, fecha_archivado DESC) WHERE fecha_archivado IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embarques_folio_unico ON embarques(folio) WHERE folio IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embarques_cliente ON embarques(cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embarques_operador ON embarques(operador_id) WHERE operador_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embarques_fecha_completado ON embarques(fecha_completado DESC) WHERE fecha_completado IS NOT NULL;

-- =====================================================================
-- RESUMEN FINAL
-- =====================================================================

SELECT 
    'ELIMINACIÓN PERSONALIZADA COMPLETADA' as estado,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%embarque%') as tablas_restantes,
    'REVISAR RESULTADO Y EJECUTAR COMANDOS ADICIONALES SI NECESARIO' as siguiente_paso;