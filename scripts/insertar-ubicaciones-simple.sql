-- Script simple para insertar ubicaciones de prueba
-- Ejecutar directamente en Supabase SQL Editor

-- Insertar algunas ubicaciones de prueba para operadores existentes
INSERT INTO locations (operator_number, latitude, longitude, device_id, captured_at) VALUES
('001', 19.432608, -99.133209, 'device_001', NOW()),
('002', 19.433731, -99.171631, 'device_002', NOW() - INTERVAL '5 minutes'),
('003', 19.418792, -99.162789, 'device_003', NOW() - INTERVAL '10 minutes'),
('004', 19.436303, -99.072097, 'device_004', NOW() - INTERVAL '15 minutes'),
('005', 19.359838, -99.259150, 'device_005', NOW() - INTERVAL '20 minutes');

-- Verificar inserción
SELECT * FROM locations ORDER BY captured_at DESC LIMIT 10;