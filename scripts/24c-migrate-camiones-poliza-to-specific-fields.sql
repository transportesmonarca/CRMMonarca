-- 24c-migrate-camiones-poliza-to-specific-fields.sql
-- Normaliza los registros existentes en alert_thresholds para módulo 'camiones'
-- que usan etiquetas genéricas ("poliza_vencimiento" / "póliza de vencimiento" / "poliza" / "vencimiento")
-- y los convierte en tres campos específicos: 'seguro_mexicano', 'seguro_americano', 'verificacion'.
-- Idempotente: si ya están normalizados, no cambia nada; si hay más o menos de 3, actúa sobre los primeros tres por fecha.

WITH candidatos AS (
  SELECT id,
         row_number() OVER (ORDER BY COALESCE(updated_at, created_at), created_at, id) AS rn
  FROM alert_thresholds
  WHERE modulo = 'camiones'
    AND lower(replace(replace(replace(campo, '_', ' '), 'ó', 'o'), 'í', 'i')) IN (
      'poliza vencimiento', 'poliza', 'vencimiento', 'poliza de vencimiento'
    )
),
updates AS (
  SELECT c.id,
         CASE c.rn
           WHEN 1 THEN 'seguro_mexicano'
           WHEN 2 THEN 'seguro_americano'
           WHEN 3 THEN 'verificacion'
           ELSE NULL
         END AS nuevo_campo
  FROM candidatos c
  WHERE c.rn <= 3
)
UPDATE alert_thresholds t
SET campo = u.nuevo_campo
FROM updates u
WHERE t.id = u.id
  AND u.nuevo_campo IS NOT NULL;

-- Opcional: Insertar los que falten tras la actualización
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
