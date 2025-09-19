-- SQL script to detect duplicate entries in tipos_servicio
-- Run this in psql or Supabase SQL editor

-- 1) Exact duplicate names (case-sensitive)
SELECT nombre, COUNT(*) AS cnt
FROM tipos_servicio
GROUP BY nombre
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- 2) Case-insensitive duplicate names (e.g. 'Pago' vs 'pago')
SELECT LOWER(nombre) AS nombre_lower, COUNT(*) AS cnt
FROM tipos_servicio
GROUP BY LOWER(nombre)
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- 3) Duplicate slugs
SELECT slug, COUNT(*) AS cnt
FROM tipos_servicio
WHERE slug IS NOT NULL
GROUP BY slug
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- 4) Duplicate IDs (shouldn't happen, but sanity check)
SELECT id, COUNT(*) AS cnt
FROM tipos_servicio
GROUP BY id
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- 5) Show rows for a given duplicated name (replace 'NOMBRE' with offending name)
-- SELECT * FROM tipos_servicio WHERE LOWER(nombre) = LOWER('NOMBRE');

-- 6) Optional: Find tipos_servicio with very similar names (Levenshtein) - requires fuzzystrmatch extension
-- CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
-- SELECT a.id AS id_a, b.id AS id_b, a.nombre AS nombre_a, b.nombre AS nombre_b, levenshtein(lower(a.nombre), lower(b.nombre)) AS dist
-- FROM tipos_servicio a
-- JOIN tipos_servicio b ON a.id <> b.id
-- WHERE levenshtein(lower(a.nombre), lower(b.nombre)) <= 3
-- ORDER BY dist, a.nombre, b.nombre;
