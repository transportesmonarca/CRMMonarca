-- Trigger: crear recordatorio de cumpleaños al insertar un nuevo operador
-- Crea una función y un trigger que insertan un recordatorio de tipo 'cumpleanos'
-- con vencimiento una semana después de la fecha de cumpleaños calculada para el año correspondiente.

CREATE OR REPLACE FUNCTION crear_recordatorio_cumpleanos_on_insert()
RETURNS trigger AS $$
DECLARE
  fecha_nacimiento DATE;
  año_actual INT;
  fecha_cumpleanos DATE;
  vencimiento TIMESTAMP;
BEGIN
  -- Tomar fecha de nacimiento del nuevo registro
  fecha_nacimiento := NEW.fecha_nacimiento;
  IF fecha_nacimiento IS NULL THEN
    RETURN NEW; -- nada que hacer
  END IF;

  año_actual := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  -- Construir la fecha de cumpleaños para el año actual
  fecha_cumpleanos := make_date(año_actual, EXTRACT(MONTH FROM fecha_nacimiento)::int, EXTRACT(DAY FROM fecha_nacimiento)::int);
  -- Si ya pasó este año, usar el próximo
  IF fecha_cumpleanos < CURRENT_DATE THEN
    fecha_cumpleanos := make_date(año_actual + 1, EXTRACT(MONTH FROM fecha_nacimiento)::int, EXTRACT(DAY FROM fecha_nacimiento)::int);
  END IF;

  vencimiento := fecha_cumpleanos + INTERVAL '7 days'; -- una semana después

  -- Evitar duplicados: verificar si ya existe un recordatorio igual para este operador y vencimiento
  IF NOT EXISTS (
    SELECT 1 FROM recordatorios
    WHERE operador_id = NEW.id
      AND tipo = 'cumpleanos'
      AND fecha_vencimiento = vencimiento::date
  ) THEN
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
      'Cumpleaños de ' || COALESCE(NEW.nombre,'') || ' ' || COALESCE(NEW.apellidos,''),
      'El cumpleaños de este operador es ' || to_char(fecha_nacimiento, 'DD/MM/YYYY') ||
        '. Fecha de cumpleaños para este año: ' || to_char(fecha_cumpleanos, 'DD/MM/YYYY') ||
        '. Vencimiento del recordatorio: ' || to_char(vencimiento, 'DD/MM/YYYY'),
      vencimiento::date,
      'cumpleanos',
      'baja',
      'pendiente',
      NEW.id,
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear (o reemplazar) trigger que ejecute la función después de insertar un operador
DROP TRIGGER IF EXISTS trg_crear_recordatorio_cumpleanos ON operadores;
CREATE TRIGGER trg_crear_recordatorio_cumpleanos
AFTER INSERT ON operadores
FOR EACH ROW
EXECUTE FUNCTION crear_recordatorio_cumpleanos_on_insert();

-- Nota: aplicar este script en la base de datos (p. ej. desde Supabase SQL editor) para habilitar el trigger.
