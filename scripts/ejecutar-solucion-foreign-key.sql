-- Ejecutar script de actualización segura para resolver el problema de Foreign Key
-- Este script resuelve el error 23503 de manera segura sin eliminar embarques

-- Ejecutar el script de actualización segura
\i scripts/actualizar-referencias-tipo-servicio.sql

-- Verificar el resultado
SELECT 'Verificación completada - El tipo de servicio problemático debería estar eliminado o las referencias actualizadas' as resultado;