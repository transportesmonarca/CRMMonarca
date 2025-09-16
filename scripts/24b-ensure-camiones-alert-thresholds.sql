-- 24b-ensure-camiones-alert-thresholds.sql
-- Asegura que existan registros de umbrales para camiones separados por póliza y verificación.
-- Ejecutar una sola vez; es idempotente.

INSERT INTO alert_thresholds (modulo, campo, dias_rojo, dias_amarillo, dias_verde)
SELECT 'camiones', 'seguro_mexicano', 10, 20, 40
WHERE NOT EXISTS (
  SELECT 1 FROM alert_thresholds WHERE modulo='camiones' AND campo='seguro_mexicano'
);

INSERT INTO alert_thresholds (modulo, campo, dias_rojo, dias_amarillo, dias_verde)
SELECT 'camiones', 'seguro_americano', 10, 20, 40
WHERE NOT EXISTS (
  SELECT 1 FROM alert_thresholds WHERE modulo='camiones' AND campo='seguro_americano'
);

INSERT INTO alert_thresholds (modulo, campo, dias_rojo, dias_amarillo, dias_verde)
SELECT 'camiones', 'verificacion', 7, 15, 30
WHERE NOT EXISTS (
  SELECT 1 FROM alert_thresholds WHERE modulo='camiones' AND campo='verificacion'
);
