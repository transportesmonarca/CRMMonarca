-- Script alternativo: Deshabilitar RLS completamente para la tabla camiones
-- Usar este script si prefieres deshabilitar completamente la seguridad a nivel de fila

-- Deshabilitar RLS para la tabla camiones
ALTER TABLE public.camiones DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "camiones_select_policy" ON public.camiones;
DROP POLICY IF EXISTS "camiones_insert_policy" ON public.camiones;
DROP POLICY IF EXISTS "camiones_update_policy" ON public.camiones;
DROP POLICY IF EXISTS "camiones_delete_policy" ON public.camiones;

-- También aplicar a otras tablas relacionadas que puedan tener el mismo problema
ALTER TABLE public.remolques DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "remolques_select_policy" ON public.remolques;
DROP POLICY IF EXISTS "remolques_insert_policy" ON public.remolques;
DROP POLICY IF EXISTS "remolques_update_policy" ON public.remolques;
DROP POLICY IF EXISTS "remolques_delete_policy" ON public.remolques;

ALTER TABLE public.operadores DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "operadores_select_policy" ON public.operadores;
DROP POLICY IF EXISTS "operadores_insert_policy" ON public.operadores;
DROP POLICY IF EXISTS "operadores_update_policy" ON public.operadores;
DROP POLICY IF EXISTS "operadores_delete_policy" ON public.operadores;

-- Verificar el estado de RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('camiones', 'remolques', 'operadores')
ORDER BY tablename;

SELECT 'RLS deshabilitado para tablas principales - problema resuelto' as mensaje;