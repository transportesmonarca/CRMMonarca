-- Script para verificar estructura de tablas normalizadas y diagnosticar problemas

-- 1. Verificar que todas las tablas existen
SELECT 
    schemaname, 
    tablename 
FROM pg_tables 
WHERE tablename IN (
    'embarques_nuevo', 
    'embarques_ubicaciones', 
    'embarques_financiero', 
    'embarques_estado', 
    'embarques_documentos', 
    'embarques_adicional'
) 
ORDER BY tablename;

-- 2. Verificar estructura de embarques_nuevo
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'embarques_nuevo' 
ORDER BY ordinal_position;

-- 3. Verificar estructura de embarques_financiero (crítica para arquitectura desacoplada)
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'embarques_financiero' 
ORDER BY ordinal_position;

-- 4. Verificar que la función crear_embarque_normalizado existe
SELECT 
    proname, 
    prosrc 
FROM pg_proc 
WHERE proname = 'crear_embarque_normalizado';

-- 5. Verificar permisos en las tablas
SELECT 
    table_name, 
    privilege_type 
FROM information_schema.table_privileges 
WHERE table_name IN (
    'embarques_nuevo', 
    'embarques_ubicaciones', 
    'embarques_financiero', 
    'embarques_estado', 
    'embarques_documentos', 
    'embarques_adicional'
) 
AND grantee = current_user;

-- 6. Probar inserción básica en embarques_nuevo
DO $$
DECLARE
    test_id UUID;
    test_folio VARCHAR(50) := 'TEST-STRUCTURE-' || EXTRACT(EPOCH FROM NOW());
BEGIN
    test_id := gen_random_uuid();
    
    RAISE NOTICE 'Probando inserción básica con ID % y folio %', test_id, test_folio;
    
    INSERT INTO embarques_nuevo (id, folio) VALUES (test_id, test_folio);
    
    RAISE NOTICE 'SUCCESS: Inserción básica exitosa';
    
    -- Limpiar el test
    DELETE FROM embarques_nuevo WHERE id = test_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: %', SQLERRM;
END $$;