-- 24a-insert-alert-thresholds-examples.sql
-- Ejemplos de configuración de umbrales para fechas de vencimiento

INSERT INTO alert_thresholds (modulo, campo, dias_rojo, dias_amarillo, dias_verde)
VALUES
  ('operadores', 'visa_vencimiento', 30, 60, 90),
  ('operadores', 'fecha_vencimiento_licencia', 15, 30, 60),
  -- Camiones: separar por tipo de póliza y verificación
  ('camiones', 'seguro_mexicano', 10, 20, 40),
  ('camiones', 'seguro_americano', 10, 20, 40),
  ('camiones', 'verificacion', 7, 15, 30),
  ('recordatorios', 'fecha_vencimiento', 3, 7, 14);
