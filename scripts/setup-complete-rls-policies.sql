-- Script completo para configurar políticas RLS para todas las tablas principales
-- Este script soluciona problemas de RLS de manera sistemática

-- Función para crear políticas permisivas estándar
CREATE OR REPLACE FUNCTION create_permissive_policies(table_name text)
RETURNS void AS $$
BEGIN
    -- Eliminar políticas existentes
    EXECUTE format('DROP POLICY IF EXISTS "%s_select_policy" ON public.%s', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert_policy" ON public.%s', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update_policy" ON public.%s', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete_policy" ON public.%s', table_name, table_name);
    
    -- Habilitar RLS
    EXECUTE format('ALTER TABLE public.%s ENABLE ROW LEVEL SECURITY', table_name);
    
    -- Crear políticas permisivas
    EXECUTE format('CREATE POLICY "%s_select_policy" ON public.%s FOR SELECT TO anon, authenticated, service_role USING (true)', table_name, table_name);
    EXECUTE format('CREATE POLICY "%s_insert_policy" ON public.%s FOR INSERT TO anon, authenticated, service_role WITH CHECK (true)', table_name, table_name);
    EXECUTE format('CREATE POLICY "%s_update_policy" ON public.%s FOR UPDATE TO anon, authenticated, service_role USING (true) WITH CHECK (true)', table_name, table_name);
    EXECUTE format('CREATE POLICY "%s_delete_policy" ON public.%s FOR DELETE TO anon, authenticated, service_role USING (true)', table_name, table_name);
    
    RAISE NOTICE 'Políticas RLS configuradas para tabla: %', table_name;
END;
$$ LANGUAGE plpgsql;

-- Aplicar políticas a las tablas principales
SELECT create_permissive_policies('camiones');
SELECT create_permissive_policies('remolques');
SELECT create_permissive_policies('operadores');
SELECT create_permissive_policies('clientes');
SELECT create_permissive_policies('embarques');
SELECT create_permissive_policies('tipos_servicio');
SELECT create_permissive_policies('marcas_camiones');
SELECT create_permissive_policies('embarque_modificaciones');

-- Verificar que las tablas tienen RLS habilitado y políticas configuradas
SELECT 
    t.schemaname,
    t.tablename,
    t.rowsecurity as "RLS_Enabled",
    COUNT(p.policyname) as "Policies_Count"
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public' 
    AND t.tablename IN ('camiones', 'remolques', 'operadores', 'clientes', 'embarques', 'tipos_servicio', 'marcas_camiones', 'embarque_modificaciones')
GROUP BY t.schemaname, t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- Limpiar función temporal
DROP FUNCTION IF EXISTS create_permissive_policies(text);

SELECT 'Políticas RLS configuradas correctamente para todas las tablas principales' as mensaje;