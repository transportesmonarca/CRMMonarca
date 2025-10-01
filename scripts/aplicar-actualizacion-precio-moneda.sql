-- Script para aplicar todas las actualizaciones necesarias para el botón de precio
-- Ejecutar en este orden:

-- 1. Agregar columna moneda_flete a embarque_modificaciones
\i scripts/32-add-moneda-flete-to-modificaciones.sql

-- 2. Actualizar función RPC para manejar precio y moneda
\i scripts/31-actualizar-precio-moneda-rpc.sql

-- Verificar que todo esté funcionando
SELECT 'Setup completado para actualización de precio y moneda' as mensaje;