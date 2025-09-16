-- 24f-rename-camiones-to-tractocamiones-and-dedupe.sql
-- 1) Renombrar modulo 'camiones' a 'tractocamiones' para los tres campos canónicos
UPDATE alert_thresholds
SET modulo='tractocamiones'
WHERE modulo='camiones' AND campo IN ('seguro_americano','seguro_mexicano','verificacion');

-- 2) Si existen ambos (camiones y tractocamiones) para el mismo campo, dejar sólo tractocamiones (preferir el más reciente)
WITH dupe AS (
  SELECT id, modulo, campo,
         ROW_NUMBER() OVER (PARTITION BY campo ORDER BY (CASE WHEN modulo='tractocamiones' THEN 0 ELSE 1 END), COALESCE(updated_at, created_at) DESC, created_at DESC, id DESC) AS rn,
         COUNT(*) OVER (PARTITION BY campo) AS cnt
  FROM alert_thresholds
  WHERE modulo IN ('camiones','tractocamiones') AND campo IN ('seguro_americano','seguro_mexicano','verificacion')
)
DELETE FROM alert_thresholds t
USING dupe d
WHERE t.id = d.id
  AND d.cnt > 1
  AND d.rn > 1;

-- 3) Dedupe final de recordatorios/fecha_vencimiento (módulo 'recordatorios') para evitar duplicados exactos
WITH dupe_rec AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY modulo, campo ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC, id DESC) AS rn
  FROM alert_thresholds
  WHERE modulo='recordatorios' AND campo='fecha_vencimiento'
)
DELETE FROM alert_thresholds t
USING dupe_rec d
WHERE t.id = d.id AND d.rn > 1;

-- 4) Eliminar alias 'fecha vencimiento' (con espacio) si existe el canónico con guion bajo
DELETE FROM alert_thresholds t
WHERE t.modulo='recordatorios' AND t.campo='fecha vencimiento'
  AND EXISTS (
    SELECT 1 FROM alert_thresholds x
    WHERE x.modulo='recordatorios' AND x.campo='fecha_vencimiento'
  );

-- 5) Eliminar campos en español bajo 'camiones' si existen los equivalentes canónicos en 'tractocamiones'
DELETE FROM alert_thresholds t
WHERE t.modulo='camiones'
  AND t.campo IN (
    'Póliza de vencimiento del seguro americano',
    'Póliza de vencimiento del seguro mexicano',
    'Próxima verificación'
  )
  AND EXISTS (
    SELECT 1 FROM alert_thresholds x
    WHERE x.modulo='tractocamiones' AND x.campo IN ('seguro_americano','seguro_mexicano','verificacion')
  );
