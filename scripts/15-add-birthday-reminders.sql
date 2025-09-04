-- Script para agregar recordatorios de cumpleaños automáticamente
-- Este script debe ejecutarse periódicamente (diariamente) para crear recordatorios de cumpleaños

-- Función para crear recordatorios de cumpleaños
CREATE OR REPLACE FUNCTION crear_recordatorios_cumpleanos(dias_anticipacion INTEGER DEFAULT 2)
RETURNS INTEGER AS $$
DECLARE
    operador_record RECORD;
    fecha_cumpleanos DATE;
    año_actual INTEGER;
    recordatorios_creados INTEGER := 0;
    vencimiento DATE;
BEGIN
    año_actual := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Iterar sobre todos los operadores activos con fecha de nacimiento
    FOR operador_record IN 
        SELECT id, nombre, apellidos, fecha_nacimiento
        FROM operadores 
        WHERE estado = 'activo' 
        AND fecha_nacimiento IS NOT NULL
    LOOP
        -- Calcular la fecha de cumpleaños para el año actual
        fecha_cumpleanos := DATE(año_actual || '-' || 
                                EXTRACT(MONTH FROM operador_record.fecha_nacimiento) || '-' || 
                                EXTRACT(DAY FROM operador_record.fecha_nacimiento));
        
        -- Si ya pasó el cumpleaños este año, usar el del próximo año
        IF fecha_cumpleanos < CURRENT_DATE THEN
            fecha_cumpleanos := DATE((año_actual + 1) || '-' || 
                                    EXTRACT(MONTH FROM operador_record.fecha_nacimiento) || '-' || 
                                    EXTRACT(DAY FROM operador_record.fecha_nacimiento));
        END IF;
        
    -- Calcular vencimiento: siempre una semana (7 días) después de la fecha de cumpleaños
    -- y formatear fechas para la descripción (DD/MM/YYYY)
    vencimiento := fecha_cumpleanos + 7;

        -- Verificar si ya existe un recordatorio para este cumpleaños con el vencimiento objetivo
        IF NOT EXISTS (
            SELECT 1 FROM recordatorios 
            WHERE operador_id = operador_record.id 
            AND tipo = 'cumpleanos'
            AND fecha_vencimiento = vencimiento
        ) THEN
            -- Crear el recordatorio con descripción que incluye la fecha de nacimiento del operador
            INSERT INTO recordatorios (
                titulo,
                descripcion,
                fecha_vencimiento,
                tipo,
                prioridad,
                estado,
                operador_id,
                fecha_creacion,
                updated_at
            ) VALUES (
                'Cumpleaños de ' || operador_record.nombre || ' ' || operador_record.apellidos,
                'El cumpleaños de este operador es ' || to_char(operador_record.fecha_nacimiento, 'DD/MM/YYYY') ||
                  '. Fecha de cumpleaños para este año: ' || to_char(fecha_cumpleanos, 'DD/MM/YYYY') ||
                  '. Vencimiento del recordatorio: ' || to_char(vencimiento, 'DD/MM/YYYY'),
                vencimiento,
                'cumpleanos',
                'baja',
                'pendiente',
                operador_record.id,
                NOW(),
                NOW()
            );

            recordatorios_creados := recordatorios_creados + 1;
        END IF;
    END LOOP;
    
    RETURN recordatorios_creados;
END;
$$ LANGUAGE plpgsql;

-- Crear recordatorios de cumpleaños con 2 días de anticipación
SELECT crear_recordatorios_cumpleanos(2);

-- Comentario: Para automatizar esto, se puede crear un cron job o usar un scheduler
-- que ejecute esta función diariamente:
-- SELECT crear_recordatorios_cumpleanos(2);
