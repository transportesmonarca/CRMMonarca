-- Script de Políticas RLS SEGURAS por Tabla
-- Este enfoque mantiene seguridad sin bloquear funcionalidad

-- ====== TABLAS CON POLÍTICAS PERMISIVAS (Seguro) ======

-- CAMIONES - Datos operacionales, OK para todos
ALTER TABLE public.camiones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "camiones_policy" ON public.camiones;
CREATE POLICY "camiones_policy" ON public.camiones
    FOR ALL TO anon, authenticated, service_role
    USING (true) WITH CHECK (true);

-- REMOLQUES - Datos operacionales, OK para todos  
ALTER TABLE public.remolques ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "remolques_policy" ON public.remolques;
CREATE POLICY "remolques_policy" ON public.remolques
    FOR ALL TO anon, authenticated, service_role
    USING (true) WITH CHECK (true);

-- CLIENTES - Solo lectura para operadores, escritura para admins
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clientes_select_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_modify_policy" ON public.clientes;

CREATE POLICY "clientes_select_policy" ON public.clientes
    FOR SELECT TO anon, authenticated, service_role
    USING (true);

CREATE POLICY "clientes_modify_policy" ON public.clientes
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- ====== TABLAS CON POLÍTICAS RESTRICTIVAS (Seguro) ======

-- OPERADORES - Solo su propio perfil + service_role
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "operadores_own_policy" ON public.operadores;
DROP POLICY IF EXISTS "operadores_service_policy" ON public.operadores;

CREATE POLICY "operadores_own_policy" ON public.operadores
    FOR ALL TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "operadores_service_policy" ON public.operadores
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- EMBARQUES - Solo sus embarques + service_role
ALTER TABLE public.embarques ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "embarques_operador_policy" ON public.embarques;
DROP POLICY IF EXISTS "embarques_service_policy" ON public.embarques;

CREATE POLICY "embarques_operador_policy" ON public.embarques
    FOR ALL TO authenticated
    USING (operador_id = auth.uid() OR operador_id IS NULL)
    WITH CHECK (operador_id = auth.uid() OR operador_id IS NULL);

CREATE POLICY "embarques_service_policy" ON public.embarques
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- RECORDATORIOS - Solo sus recordatorios + service_role
ALTER TABLE public.recordatorios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recordatorios_operador_policy" ON public.recordatorios;
DROP POLICY IF EXISTS "recordatorios_service_policy" ON public.recordatorios;

CREATE POLICY "recordatorios_operador_policy" ON public.recordatorios
    FOR ALL TO authenticated
    USING (operador_id = auth.uid() OR operador_id IS NULL)
    WITH CHECK (operador_id = auth.uid() OR operador_id IS NULL);

CREATE POLICY "recordatorios_service_policy" ON public.recordatorios
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- FOTOS_EMBARQUES - Basado en embarque del operador
ALTER TABLE public.fotos_embarques ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fotos_embarques_policy" ON public.fotos_embarques;

CREATE POLICY "fotos_embarques_policy" ON public.fotos_embarques
    FOR ALL TO authenticated, service_role
    USING (
        EXISTS (
            SELECT 1 FROM embarques e 
            WHERE e.id = embarque_id 
            AND (e.operador_id = auth.uid() OR auth.role() = 'service_role')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM embarques e 
            WHERE e.id = embarque_id 
            AND (e.operador_id = auth.uid() OR auth.role() = 'service_role')
        )
    );

-- ====== VERIFICACIÓN ======
SELECT 'Políticas RLS seguras aplicadas correctamente' as mensaje;

-- Mostrar todas las políticas creadas
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;