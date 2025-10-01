-- Script para configurar políticas RLS para la tabla camiones
-- Este script soluciona el error "new row violates row-level security policy"

-- Primero verificamos si RLS está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'camiones';

-- Deshabilitar RLS temporalmente si está causando problemas
ALTER TABLE public.camiones DISABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "camiones_select_policy" ON public.camiones;
DROP POLICY IF EXISTS "camiones_insert_policy" ON public.camiones;
DROP POLICY IF EXISTS "camiones_update_policy" ON public.camiones;
DROP POLICY IF EXISTS "camiones_delete_policy" ON public.camiones;

-- Habilitar RLS nuevamente
ALTER TABLE public.camiones ENABLE ROW LEVEL SECURITY;

-- Crear políticas permisivas para todas las operaciones
-- Política para SELECT (lectura)
CREATE POLICY "camiones_select_policy" ON public.camiones
    FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

-- Política para INSERT (creación)
CREATE POLICY "camiones_insert_policy" ON public.camiones
    FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

-- Política para UPDATE (actualización)
CREATE POLICY "camiones_update_policy" ON public.camiones
    FOR UPDATE
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- Política para DELETE (eliminación)
CREATE POLICY "camiones_delete_policy" ON public.camiones
    FOR DELETE
    TO anon, authenticated, service_role
    USING (true);

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'camiones'
ORDER BY policyname;

-- Mensaje de confirmación
SELECT 'Políticas RLS para tabla camiones configuradas correctamente' as mensaje;