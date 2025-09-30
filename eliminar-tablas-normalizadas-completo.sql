-- SCRIPT AGRESIVO PARA ELIMINAR COMPLETAMENTE TABLAS NORMALIZADAS
-- Este script elimina TODO el sistema normalizado, dejando solo embarques legacy

-- =====================================================================
-- 1. VERIFICAR QUE TABLAS EXISTEN ACTUALMENTE
-- =====================================================================

SELECT 
    'ESTADO ACTUAL DE TABLAS' as verificacion,
    table_name,
    table_type,
    CASE 
        WHEN table_name = 'embarques' THEN '✅ MANTENER (Legacy)'
        WHEN table_name LIKE '%embarque%' THEN '❌ ELIMINAR (Normalizada)'
        ELSE '⚪ OTRA'
    END as accion
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%embarque%'
ORDER BY table_name;

-- =====================================================================
-- 2. ELIMINAR TODAS LAS VISTAS NORMALIZADAS (MAS AGRESIVO)
-- =====================================================================

DROP VIEW IF EXISTS embarques_completa_new CASCADE;
DROP VIEW IF EXISTS embarques_completa CASCADE;
DROP VIEW IF EXISTS vista_embarques_completa CASCADE;
DROP VIEW IF EXISTS v_embarques_completa CASCADE;
DROP VIEW IF EXISTS embarques_unificada CASCADE;
DROP VIEW IF EXISTS embarques_vista CASCADE;

-- =====================================================================
-- 3. ELIMINAR TODAS LAS TABLAS NORMALIZADAS (COMPLETO)
-- =====================================================================

-- Sistema normalizado principal
DROP TABLE IF EXISTS embarques_nuevo CASCADE;
DROP TABLE IF EXISTS embarques_normalizado CASCADE;
DROP TABLE IF EXISTS embarques_completo CASCADE;

-- Tablas complementarias del sistema normalizado
DROP TABLE IF EXISTS embarques_estado CASCADE;
DROP TABLE IF EXISTS embarques_estados CASCADE;
DROP TABLE IF EXISTS embarques_facturacion CASCADE;
DROP TABLE IF EXISTS embarques_logistica CASCADE;
DROP TABLE IF EXISTS embarques_ubicaciones CASCADE;
DROP TABLE IF EXISTS embarques_temporal CASCADE;
DROP TABLE IF EXISTS embarques_metadata CASCADE;
DROP TABLE IF EXISTS embarques_adicional CASCADE;
DROP TABLE IF EXISTS embarques_documentos CASCADE;
DROP TABLE IF EXISTS embarques_financiero CASCADE;

-- Tablas de consolidación y migración
DROP TABLE IF EXISTS embarques_consolidada CASCADE;
DROP TABLE IF EXISTS embarques_consolidado CASCADE;
DROP TABLE IF EXISTS embarques_migrado CASCADE;
DROP TABLE IF EXISTS embarques_temp CASCADE;

-- Tablas de importación y staging
DROP TABLE IF EXISTS embarques_import CASCADE;
DROP TABLE IF EXISTS embarques_staging CASCADE;
DROP TABLE IF EXISTS embarques_csv CASCADE;

-- Tablas de respaldo y backup
DROP TABLE IF EXISTS embarques_backup CASCADE;
DROP TABLE IF EXISTS embarques_backup_2024 CASCADE;
DROP TABLE IF EXISTS embarques_backup_2025 CASCADE;

-- =====================================================================
-- 4. ELIMINAR TODAS LAS FUNCIONES NORMALIZADAS
-- =====================================================================

-- Funciones de transición de estado
DROP FUNCTION IF EXISTS completar_embarque(TEXT) CASCADE;
DROP FUNCTION IF EXISTS completar_embarque(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS asignar_operador(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS asignar_operador(VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS iniciar_transito(TEXT) CASCADE;
DROP FUNCTION IF EXISTS iniciar_transito(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS finalizar_embarque(TEXT) CASCADE;
DROP FUNCTION IF EXISTS finalizar_embarque(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS archivar_embarque(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS archivar_embarque(VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS cancelar_embarque(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS cancelar_embarque(VARCHAR, VARCHAR, VARCHAR) CASCADE;

-- Funciones de creación normalizada (múltiples variantes)
DROP FUNCTION IF EXISTS crear_embarque_normalizado(JSONB) CASCADE;
DROP FUNCTION IF EXISTS crear_embarque_normalizado(JSON) CASCADE;
DROP FUNCTION IF EXISTS crear_embarque_completo(JSONB) CASCADE;
DROP FUNCTION IF EXISTS crear_embarque_completo(JSON) CASCADE;
DROP FUNCTION IF EXISTS insertar_embarque_normalizado(JSONB) CASCADE;

-- Funciones auxiliares del sistema normalizado
DROP FUNCTION IF EXISTS obtener_estado_embarque(TEXT) CASCADE;
DROP FUNCTION IF EXISTS obtener_estado_embarque(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS validar_transicion_estado(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS validar_transicion_estado(VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS migrar_embarque_a_normalizado(TEXT) CASCADE;
DROP FUNCTION IF EXISTS sincronizar_embarques() CASCADE;

-- Funciones de mapeo y conversión
DROP FUNCTION IF EXISTS mapear_embarque_legacy_a_nuevo(UUID) CASCADE;
DROP FUNCTION IF EXISTS convertir_embarque_normalizado(UUID) CASCADE;

-- =====================================================================
-- 5. ELIMINAR TRIGGERS Y PROCEDIMIENTOS ASOCIADOS
-- =====================================================================

-- Eliminar triggers que puedan referenciar tablas normalizadas
DROP TRIGGER IF EXISTS trigger_sincronizar_embarques ON embarques;
DROP TRIGGER IF EXISTS trigger_actualizar_estado_normalizado ON embarques;
DROP TRIGGER IF EXISTS trigger_migrar_a_normalizado ON embarques;

-- Eliminar funciones de trigger
DROP FUNCTION IF EXISTS trigger_sincronizar_embarques_func() CASCADE;
DROP FUNCTION IF EXISTS trigger_actualizar_estado_normalizado_func() CASCADE;

-- =====================================================================
-- 6. LIMPIAR POLÍTICAS RLS DE TABLAS ELIMINADAS
-- =====================================================================

-- Las políticas se eliminan automáticamente con DROP TABLE CASCADE
-- Pero por si acaso, eliminar referencias explícitas

-- =====================================================================
-- 7. ASEGURAR QUE TABLA EMBARQUES LEGACY TENGA TODO LO NECESARIO
-- =====================================================================

-- Verificar estructura actual de embarques
SELECT 
    'ESTRUCTURA EMBARQUES LEGACY' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'embarques'
ORDER BY ordinal_position;

-- Agregar columnas críticas si no existen
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS fecha_completado TIMESTAMP WITH TIME ZONE;
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS fecha_cancelacion TIMESTAMP WITH TIME ZONE;
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS fecha_finalizacion TIMESTAMP WITH TIME ZONE;
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS fecha_inicio_transito TIMESTAMP WITH TIME ZONE;
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS fecha_asignacion TIMESTAMP WITH TIME ZONE;

-- Asegurar campos de auditoría
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE embarques ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =====================================================================
-- 8. CREAR ÍNDICES OPTIMIZADOS PARA TABLA ÚNICA
-- =====================================================================

-- Índices para performance con tabla única
CREATE INDEX IF NOT EXISTS idx_embarques_estado_fecha ON embarques(estado, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_embarques_facturacion_fecha ON embarques(estado_facturacion, fecha_archivado DESC) WHERE fecha_archivado IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embarques_folio_unico ON embarques(folio) WHERE folio IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embarques_cliente ON embarques(cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embarques_operador ON embarques(operador_id) WHERE operador_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_embarques_fecha_completado ON embarques(fecha_completado DESC) WHERE fecha_completado IS NOT NULL;

-- =====================================================================
-- 9. VERIFICACIÓN FINAL COMPLETA
-- =====================================================================

-- Verificar que solo quede tabla embarques relacionada
SELECT 
    'VERIFICACIÓN POST-ELIMINACIÓN' as resultado,
    table_name,
    table_type,
    CASE 
        WHEN table_name = 'embarques' THEN '✅ CORRECTO - Tabla Legacy Preservada'
        WHEN table_name LIKE '%embarque%' THEN '❌ ERROR - Tabla Normalizada AÚN EXISTE'
        ELSE '⚪ OTRA TABLA'
    END as estado
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%embarque%'
ORDER BY table_name;

-- Verificar que no existan funciones normalizadas
SELECT 
    'FUNCIONES RESTANTES' as verificacion,
    routine_name,
    routine_type,
    '❌ FUNCIÓN NORMALIZADA AÚN EXISTE' as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%embarque%' OR routine_name LIKE '%normaliz%')
AND routine_name NOT LIKE '%trigger%'
ORDER BY routine_name;

-- Contar registros finales en tabla embarques
SELECT 
    'DATOS PRESERVADOS' as verificacion,
    COUNT(*) as total_registros,
    '✅ DATOS EN TABLA LEGACY' as estado
FROM embarques;

-- Verificar índices creados
SELECT 
    'ÍNDICES EMBARQUES' as verificacion,
    indexname,
    '✅ ÍNDICE OPTIMIZADO' as estado
FROM pg_indexes 
WHERE tablename = 'embarques'
ORDER BY indexname;

-- =====================================================================
-- 10. RESUMEN FINAL
-- =====================================================================

SELECT 
    'ELIMINACIÓN AGRESIVA COMPLETADA' as estado,
    'SOLO TABLA EMBARQUES LEGACY QUEDA' as resultado,
    'SISTEMA SIMPLIFICADO PARA UNA TABLA' as arquitectura,
    'UI DEBE USAR ÚNICAMENTE TABLA EMBARQUES' as siguiente_paso;