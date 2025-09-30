-- =====================================================================
-- 🔥 ELIMINAR FUNCIONES NORMALIZADAS QUE CAUSAN ERRORES
-- =====================================================================
-- Ejecuta este SQL en Supabase después del script de tablas

-- Eliminar funciones del sistema normalizado
DROP FUNCTION IF EXISTS crear_embarque_normalizado(
    p_folio text,
    p_cliente_id uuid,
    p_tipo_servicio_id uuid,
    p_contenido text,
    p_peso numeric,
    p_load_number text,
    p_origen text,
    p_destino text,
    p_direccion_recolecta text,
    p_direccion_entrega text,
    p_fecha_recolecta date,
    p_hora_recolecta text,
    p_fecha_entrega date,
    p_hora_entrega text,
    p_camion_id uuid,
    p_remolque_id uuid,
    p_camion_numero_economico text,
    p_camion_placa text,
    p_remolque_numero_economico text,
    p_remolque_placa text,
    p_carta_porte text,
    p_patente_agente_aduanal text,
    p_aduana_cruce text,
    p_dueno_mercancia text,
    p_representante_cliente uuid,
    p_info_representante jsonb,
    p_observaciones text
) CASCADE;

-- Eliminar otras variaciones de la función
DROP FUNCTION IF EXISTS crear_embarque_normalizado CASCADE;
DROP FUNCTION IF EXISTS embarque_crear_normalizado CASCADE;
DROP FUNCTION IF EXISTS insertar_embarque_normalizado CASCADE;
DROP FUNCTION IF EXISTS crear_embarque_completo CASCADE;
DROP FUNCTION IF EXISTS crear_embarque_nuevo CASCADE;

-- Eliminar funciones de migración y backup  
DROP FUNCTION IF EXISTS migrar_embarque CASCADE;
DROP FUNCTION IF EXISTS embarque_backup CASCADE;
DROP FUNCTION IF EXISTS sincronizar_embarques CASCADE;
DROP FUNCTION IF EXISTS normalizar_embarque CASCADE;

-- Eliminar funciones de mantenimiento normalizadas
DROP FUNCTION IF EXISTS limpiar_embarques_normalizados CASCADE;
DROP FUNCTION IF EXISTS consolidar_embarques CASCADE;
DROP FUNCTION IF EXISTS reorganizar_embarques CASCADE;

-- =====================================================================
-- VERIFICAR QUE NO QUEDEN FUNCIONES RELACIONADAS
-- =====================================================================

SELECT 
    'FUNCIONES RELACIONADAS CON EMBARQUES QUE AÚN EXISTEN' as info,
    proname as nombre_funcion,
    'DROP FUNCTION IF EXISTS ' || proname || ' CASCADE;' as comando_eliminar
FROM pg_proc 
WHERE proname LIKE '%embarque%' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- =====================================================================
-- VERIFICAR TAMBIÉN LOS TRIGGERS
-- =====================================================================

SELECT 
    'TRIGGERS RELACIONADOS CON EMBARQUES' as info,
    trigger_name,
    event_object_table,
    'DROP TRIGGER IF EXISTS ' || trigger_name || ' ON ' || event_object_table || ';' as comando_eliminar
FROM information_schema.triggers 
WHERE trigger_name LIKE '%embarque%' 
   OR event_object_table LIKE '%embarque%'
ORDER BY trigger_name;

-- =====================================================================
-- LIMPIAR POLÍTICAS RLS DE TABLAS ELIMINADAS
-- =====================================================================

-- Las políticas RLS se eliminan automáticamente cuando se eliminan las tablas,
-- pero por si acaso verificamos que no queden referencias
SELECT 
    'POLÍTICAS RLS EXISTENTES' as info,
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE tablename LIKE '%embarque%'
ORDER BY tablename, policyname;

-- =====================================================================
-- RESUMEN DE FUNCIONES ELIMINADAS
-- =====================================================================

SELECT 
    'ELIMINACIÓN DE FUNCIONES COMPLETADA' as estado,
    (SELECT COUNT(*) FROM pg_proc WHERE proname LIKE '%embarque%' 
     AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) as funciones_restantes,
    'SI HAY FUNCIONES RESTANTES, EJECUTA LOS COMANDOS DROP MOSTRADOS ARRIBA' as siguiente_paso;