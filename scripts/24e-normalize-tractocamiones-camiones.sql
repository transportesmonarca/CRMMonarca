-- 24e-normalize-tractocamiones-camiones.sql
-- Objetivo: detectar filas en alert_thresholds con modulo 'tractocamiones'
-- que equivalen a los campos de 'camiones' y eliminarlas si están duplicadas,
-- o migrarlas a modulo='camiones' con el campo canónico si no existe duplicado.

WITH tc AS (
  SELECT id,
         modulo,
         campo,
         lower(
           replace(
             replace(
               replace(
                 replace(
                   replace(
                     replace(replace(campo, '_', ' '), 'á','a'),'é','e'
                   ),'í','i'
                 ),'ó','o'
               ),'ú','u'
             ),'ñ','n'
           )
         ) AS campo_norm
  FROM alert_thresholds
  WHERE lower(modulo) = 'tractocamiones'
), mapped AS (
  SELECT id,
         CASE
           WHEN campo_norm LIKE '%americano%' THEN 'seguro_americano'
           WHEN campo_norm LIKE '%mexican%' THEN 'seguro_mexicano'
           WHEN campo_norm LIKE '%verific%' OR campo_norm LIKE '%proxima verificacion%' THEN 'verificacion'
           ELSE NULL
         END AS nuevo_campo
  FROM tc
)
-- 1) Eliminar tractocamiones duplicados si ya existe el equivalente en camiones
DELETE FROM alert_thresholds t
USING mapped m
WHERE t.id = m.id
  AND m.nuevo_campo IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM alert_thresholds x WHERE x.modulo='camiones' AND x.campo = m.nuevo_campo
  );

-- 2) Migrar los restantes a camiones con el campo canónico
WITH tc AS (
  SELECT id,
         modulo,
         campo,
         lower(
           replace(
             replace(
               replace(
                 replace(
                   replace(
                     replace(replace(campo, '_', ' '), 'á','a'),'é','e'
                   ),'í','i'
                 ),'ó','o'
               ),'ú','u'
             ),'ñ','n'
           )
         ) AS campo_norm
  FROM alert_thresholds
  WHERE lower(modulo) = 'tractocamiones'
), mapped AS (
  SELECT id,
         CASE
           WHEN campo_norm LIKE '%americano%' THEN 'seguro_americano'
           WHEN campo_norm LIKE '%mexican%' THEN 'seguro_mexicano'
           WHEN campo_norm LIKE '%verific%' OR campo_norm LIKE '%proxima verificacion%' THEN 'verificacion'
           ELSE NULL
         END AS nuevo_campo
  FROM tc
)
UPDATE alert_thresholds t
SET modulo='camiones', campo = m.nuevo_campo
FROM mapped m
WHERE t.id = m.id
  AND m.nuevo_campo IS NOT NULL;

-- 3) Dedupe final por seguridad: dejar el más reciente por (modulo='camiones', campo)
WITH dupe AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY modulo, campo ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC, id DESC) AS rn
  FROM alert_thresholds
  WHERE modulo='camiones' AND campo IN ('seguro_americano','seguro_mexicano','verificacion')
)
DELETE FROM alert_thresholds t USING dupe d
WHERE t.id = d.id AND d.rn > 1;
