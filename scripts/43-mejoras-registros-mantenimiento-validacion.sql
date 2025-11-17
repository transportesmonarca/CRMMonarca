-- Mejoras para la tabla de registros de mantenimiento de camiones
-- Agregar validación de fechas y ampliar tipos de mantenimiento

-- 1. Agregar constraint para validar que la fecha del próximo mantenimiento no sea anterior a la fecha del mantenimiento
DO $$ 
BEGIN
    -- Intentar eliminar el constraint si existe (para evitar errores en re-ejecuciones)
    BEGIN
        ALTER TABLE registros_mantenimiento DROP CONSTRAINT IF EXISTS check_fecha_proximo_mantenimiento;
    EXCEPTION
        WHEN undefined_object THEN NULL;
    END;

    -- Agregar el nuevo constraint
    ALTER TABLE registros_mantenimiento 
    ADD CONSTRAINT check_fecha_proximo_mantenimiento 
    CHECK (proximo_mantenimiento IS NULL OR proximo_mantenimiento >= fecha_mantenimiento);

    RAISE NOTICE 'Constraint de validación de fechas agregado exitosamente';
END $$;

-- 2. Actualizar comentario del campo tipo_mantenimiento para incluir "otro"
COMMENT ON COLUMN registros_mantenimiento.tipo_mantenimiento IS 'Tipo de mantenimiento: preventivo, correctivo, general, motor, frenos, transmision, suspension, electrico, otro';

-- 3. Crear función para validar fechas antes de insertar o actualizar (como respaldo adicional)
CREATE OR REPLACE FUNCTION validate_mantenimiento_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que la fecha del próximo mantenimiento no sea anterior a la fecha del mantenimiento
    IF NEW.proximo_mantenimiento IS NOT NULL AND NEW.proximo_mantenimiento < NEW.fecha_mantenimiento THEN
        RAISE EXCEPTION 'La fecha del próximo mantenimiento (%) no puede ser anterior a la fecha del mantenimiento actual (%)', 
            NEW.proximo_mantenimiento, NEW.fecha_mantenimiento;
    END IF;

    -- Validar que las fechas no sean futuras (opcional - descomenta si es necesario)
    -- IF NEW.fecha_mantenimiento > CURRENT_DATE THEN
    --     RAISE EXCEPTION 'La fecha del mantenimiento no puede ser futura: %', NEW.fecha_mantenimiento;
    -- END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear triggers para la validación
DROP TRIGGER IF EXISTS trigger_validate_mantenimiento_dates_insert ON registros_mantenimiento;
CREATE TRIGGER trigger_validate_mantenimiento_dates_insert
    BEFORE INSERT ON registros_mantenimiento
    FOR EACH ROW
    EXECUTE FUNCTION validate_mantenimiento_dates();

DROP TRIGGER IF EXISTS trigger_validate_mantenimiento_dates_update ON registros_mantenimiento;
CREATE TRIGGER trigger_validate_mantenimiento_dates_update
    BEFORE UPDATE ON registros_mantenimiento
    FOR EACH ROW
    EXECUTE FUNCTION validate_mantenimiento_dates();

-- 5. Verificar y mostrar estadísticas
DO $$ 
DECLARE
    total_records INTEGER;
    invalid_records INTEGER;
BEGIN
    -- Contar registros totales
    SELECT COUNT(*) INTO total_records FROM registros_mantenimiento;
    
    -- Contar registros con fechas inválidas (si existen)
    SELECT COUNT(*) INTO invalid_records 
    FROM registros_mantenimiento 
    WHERE proximo_mantenimiento IS NOT NULL 
    AND proximo_mantenimiento < fecha_mantenimiento;

    RAISE NOTICE 'Total de registros de mantenimiento: %', total_records;
    
    IF invalid_records > 0 THEN
        RAISE WARNING 'Se encontraron % registros con fechas inválidas que necesitan corrección', invalid_records;
        
        -- Mostrar los registros problemáticos para revisión manual
        RAISE NOTICE 'Registros con fechas inválidas:';
        FOR i IN (
            SELECT id, fecha_mantenimiento, proximo_mantenimiento 
            FROM registros_mantenimiento 
            WHERE proximo_mantenimiento IS NOT NULL 
            AND proximo_mantenimiento < fecha_mantenimiento
            LIMIT 10
        ) LOOP
            RAISE NOTICE 'ID: %, Fecha Mant: %, Próximo: %', i.id, i.fecha_mantenimiento, i.proximo_mantenimiento;
        END LOOP;
    ELSE
        RAISE NOTICE 'Todas las fechas están correctamente validadas';
    END IF;
END $$;

-- 6. Comentarios finales
COMMENT ON CONSTRAINT check_fecha_proximo_mantenimiento ON registros_mantenimiento 
IS 'Asegura que la fecha del próximo mantenimiento sea igual o posterior a la fecha del mantenimiento actual';

COMMENT ON FUNCTION validate_mantenimiento_dates() 
IS 'Función para validar fechas de mantenimiento antes de insertar o actualizar registros';

RAISE NOTICE 'Script de mejoras para registros_mantenimiento ejecutado exitosamente';
RAISE NOTICE 'Se agregó: 1) Validación de fechas, 2) Tipo "otro" documentado, 3) Triggers de validación';