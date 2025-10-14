-- Script para agregar campo operator_number con numeración consecutiva automática
-- Similar al sistema de folio de embarques

-- 1. Agregar la columna operator_number a la tabla operadores
ALTER TABLE operadores ADD COLUMN IF NOT EXISTS operator_number TEXT;

-- 2. Crear índice único para el operator_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_operadores_operator_number_unique 
ON operadores (operator_number) 
WHERE operator_number IS NOT NULL;

-- 3. Crear función para generar el siguiente número de operador
CREATE OR REPLACE FUNCTION generate_next_operator_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    formatted_number TEXT;
BEGIN
    -- Buscar el número más alto actual y agregar 1
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(operator_number FROM '^OP(\d+)$') AS INTEGER)), 
        0
    ) + 1 INTO next_num
    FROM operadores 
    WHERE operator_number ~ '^OP\d+$';
    
    -- Formatear como OPXXX (3 dígitos con padding de ceros)
    formatted_number := 'OP' || LPAD(next_num::TEXT, 3, '0');
    
    RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear función trigger que asigna automáticamente el operator_number
CREATE OR REPLACE FUNCTION assign_operator_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo asignar si no tiene operator_number o si está vacío
    IF NEW.operator_number IS NULL OR NEW.operator_number = '' THEN
        -- Intentar hasta 10 veces para evitar conflictos de concurrencia
        FOR i IN 1..10 LOOP
            BEGIN
                NEW.operator_number := generate_next_operator_number();
                EXIT; -- Si no hay error, salir del loop
            EXCEPTION WHEN unique_violation THEN
                -- Si hay conflicto, intentar de nuevo
                CONTINUE;
            END;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear trigger que se ejecuta antes de INSERT
DROP TRIGGER IF EXISTS trigger_assign_operator_number ON operadores;
CREATE TRIGGER trigger_assign_operator_number
    BEFORE INSERT ON operadores
    FOR EACH ROW
    EXECUTE FUNCTION assign_operator_number();

-- 6. Asignar números a operadores existentes que no tengan
DO $$
DECLARE
    operador_record RECORD;
    new_number TEXT;
BEGIN
    -- Iterar sobre operadores sin número asignado
    FOR operador_record IN 
        SELECT id FROM operadores 
        WHERE operator_number IS NULL OR operator_number = ''
        ORDER BY fecha_registro ASC, id ASC
    LOOP
        -- Generar nuevo número
        new_number := generate_next_operator_number();
        
        -- Actualizar el operador
        UPDATE operadores 
        SET operator_number = new_number 
        WHERE id = operador_record.id;
        
        RAISE NOTICE 'Asignado número % al operador ID %', new_number, operador_record.id;
    END LOOP;
END $$;

-- 7. Verificar la implementación
DO $$
DECLARE
    total_operadores INTEGER;
    operadores_con_numero INTEGER;
    ultimo_numero TEXT;
BEGIN
    SELECT COUNT(*) INTO total_operadores FROM operadores;
    SELECT COUNT(*) INTO operadores_con_numero FROM operadores WHERE operator_number IS NOT NULL;
    SELECT MAX(operator_number) INTO ultimo_numero FROM operadores WHERE operator_number ~ '^OP\d+$';
    
    RAISE NOTICE '=== RESUMEN OPERATOR_NUMBER ===';
    RAISE NOTICE 'Total operadores: %', total_operadores;
    RAISE NOTICE 'Operadores con número: %', operadores_con_numero;
    RAISE NOTICE 'Último número asignado: %', ultimo_numero;
    
    IF total_operadores = operadores_con_numero THEN
        RAISE NOTICE '✓ Todos los operadores tienen número asignado';
    ELSE
        RAISE WARNING '⚠ Algunos operadores no tienen número asignado';
    END IF;
END $$;

-- 8. Mostrar algunos ejemplos de los números asignados
SELECT 
    id, 
    nombre, 
    apellidos, 
    operator_number, 
    fecha_registro
FROM operadores 
WHERE operator_number IS NOT NULL
ORDER BY operator_number ASC
LIMIT 10;