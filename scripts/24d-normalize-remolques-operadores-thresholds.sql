-- 24d-normalize-remolques-operadores-thresholds.sql
-- Objetivo: normalizar y des-duplicar umbrales para remolques y operadores, y agregar 'operadores/fecha_nacimiento'.

-- 1) Remolques: renombrar etiquetas genéricas a campos específicos
WITH rem_candidatos AS (
  SELECT id,
         lower(replace(replace(replace(campo, '_', ' '), 'ó', 'o'), 'í', 'i')) AS campo_norm
  FROM alert_thresholds
  WHERE modulo = 'remolques'
)
UPDATE alert_thresholds t
SET campo = CASE
  WHEN r.campo_norm IN ('proxima inspeccion', 'proxima inspeccion del remolque', 'inspeccion', 'inspeccion del remolque') THEN 'proxima_inspeccion'
  WHEN r.campo_norm IN ('seguro', 'poliza', 'poliza vencimiento', 'vigencia del seguro', 'vigencia del seguro del remolque', 'seguro vigencia', 'vigencia seguro', 'vigencia seguro del remolque') THEN 'vigencia del seguro del remolque'
  ELSE t.campo
END
FROM rem_candidatos r
WHERE t.id = r.id
  AND (
    r.campo_norm IN ('proxima inspeccion', 'proxima inspeccion del remolque', 'inspeccion', 'inspeccion del remolque')
  OR r.campo_norm IN ('seguro', 'poliza', 'poliza vencimiento', 'vigencia del seguro', 'vigencia del seguro del remolque', 'seguro vigencia', 'vigencia seguro', 'vigencia seguro del remolque')
  );

-- Asegurar existencia de ambos
INSERT INTO alert_thresholds (modulo, campo, dias_rojo, dias_amarillo, dias_verde)
SELECT 'remolques', 'proxima_inspeccion', 7, 15, 30
WHERE NOT EXISTS (
  SELECT 1 FROM alert_thresholds WHERE modulo='remolques' AND campo='proxima_inspeccion'
);

-- Evitar crear alias 'seguro_vigencia'; usar la etiqueta consolidada
INSERT INTO alert_thresholds (modulo, campo, dias_rojo, dias_amarillo, dias_verde)
SELECT 'remolques', 'vigencia del seguro del remolque', 10, 20, 40
WHERE NOT EXISTS (
  SELECT 1 FROM alert_thresholds WHERE modulo='remolques' AND campo='vigencia del seguro del remolque'
);

-- Si existen alias vs canónico, eliminar alias ('seguro_vigencia', 'vigencia seguro', 'vigencia seguro del remolque') cuando exista el canónico
DELETE FROM alert_thresholds t
WHERE t.modulo='remolques' AND t.campo IN ('seguro_vigencia','vigencia seguro','vigencia seguro del remolque')
  AND EXISTS (
    SELECT 1 FROM alert_thresholds x WHERE x.modulo='remolques' AND x.campo='vigencia del seguro del remolque'
  );

-- 2) Operadores: normalizar alias y remover duplicados
-- 2.0) Normalizar variantes con espacios a los nombres canónicos
WITH op_candidatos AS (
  SELECT id,
         lower(replace(campo, '_', ' ')) AS campo_norm
  FROM alert_thresholds
  WHERE modulo='operadores'
)
UPDATE alert_thresholds t
SET campo = CASE
  WHEN o.campo_norm IN ('licencia vencimiento','vencimiento licencia','fecha vencimiento licencia') THEN 'fecha_vencimiento_licencia'
  WHEN o.campo_norm IN ('visa vencimiento','vencimiento visa','fecha vencimiento visa') THEN 'visa_vencimiento'
  ELSE t.campo
END
FROM op_candidatos o
WHERE t.id = o.id
  AND o.campo_norm IN (
    'licencia vencimiento','vencimiento licencia','fecha vencimiento licencia',
    'visa vencimiento','vencimiento visa','fecha vencimiento visa'
  );

-- 2.a) Si existe el alias 'licencia_vencimiento' y ya existe el canónico 'fecha_vencimiento_licencia', eliminar el alias
DELETE FROM alert_thresholds t
WHERE t.modulo='operadores' AND t.campo='licencia_vencimiento'
  AND EXISTS (
    SELECT 1 FROM alert_thresholds x
    WHERE x.modulo='operadores' AND x.campo='fecha_vencimiento_licencia'
  );

-- 2.b) Si queda algún 'licencia_vencimiento' sin su canónico, renombrarlo a 'fecha_vencimiento_licencia'
UPDATE alert_thresholds
SET campo = 'fecha_vencimiento_licencia'
WHERE modulo='operadores' AND campo='licencia_vencimiento';

-- 2.c) Asegurar existencia del canónico 'fecha_vencimiento_licencia' con valores por defecto si no existe
INSERT INTO alert_thresholds (modulo, campo, dias_rojo, dias_amarillo, dias_verde)
SELECT 'operadores', 'fecha_vencimiento_licencia', 15, 30, 60
WHERE NOT EXISTS (
  SELECT 1 FROM alert_thresholds WHERE modulo='operadores' AND campo='fecha_vencimiento_licencia'
);

-- 2.d) Remover duplicados exactos (licencia/visa), dejando el más reciente según updated_at/created_at
WITH dupe_op AS (
  SELECT id, modulo, campo,
         ROW_NUMBER() OVER (PARTITION BY modulo, campo ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC, id DESC) AS rn
  FROM alert_thresholds
  WHERE modulo='operadores' AND campo IN ('fecha_vencimiento_licencia','visa_vencimiento')
)
DELETE FROM alert_thresholds t
USING dupe_op d
WHERE t.id = d.id AND d.rn > 1;

-- 3) Operadores: asegurar 'fecha_nacimiento'
INSERT INTO alert_thresholds (modulo, campo, dias_rojo, dias_amarillo, dias_verde)
SELECT 'operadores', 'fecha_nacimiento', 0, 0, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM alert_thresholds WHERE modulo='operadores' AND campo='fecha_nacimiento'
);
