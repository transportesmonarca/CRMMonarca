-- Script para insertar ubicaciones de prueba para testing
-- Usar estos datos para probar el sistema de ubicación en tiempo real

-- Eliminar ubicaciones existentes (opcional, solo para testing limpio)
-- DELETE FROM locations;

-- Insertar ubicaciones de prueba en Ciudad de México y alrededores
INSERT INTO locations (operator_number, latitude, longitude, device_id, captured_at) VALUES

-- Operador 001: Centro Histórico de CDMX
('001', 19.432608, -99.133209, 'device_001_android', NOW() - INTERVAL '5 minutes'),
('001', 19.433108, -99.133709, 'device_001_android', NOW() - INTERVAL '3 minutes'),
('001', 19.433608, -99.134209, 'device_001_android', NOW()),

-- Operador 002: Zona Polanco  
('002', 19.433731, -99.171631, 'device_002_ios', NOW() - INTERVAL '10 minutes'),
('002', 19.434231, -99.172131, 'device_002_ios', NOW() - INTERVAL '7 minutes'),
('002', 19.434731, -99.172631, 'device_002_ios', NOW() - INTERVAL '2 minutes'),

-- Operador 003: Zona Roma Norte
('003', 19.418792, -99.162789, 'device_003_android', NOW() - INTERVAL '15 minutes'),
('003', 19.419292, -99.163289, 'device_003_android', NOW() - INTERVAL '8 minutes'),
('003', 19.419792, -99.163789, 'device_003_android', NOW() - INTERVAL '1 minute'),

-- Operador 004: Aeropuerto CDMX
('004', 19.436303, -99.072097, 'device_004_ios', NOW() - INTERVAL '20 minutes'),
('004', 19.436803, -99.072597, 'device_004_ios', NOW() - INTERVAL '12 minutes'),

-- Operador 005: Santa Fe
('005', 19.359838, -99.259150, 'device_005_android', NOW() - INTERVAL '25 minutes'),
('005', 19.360338, -99.259650, 'device_005_android', NOW() - INTERVAL '18 minutes'),
('005', 19.360838, -99.260150, 'device_005_android', NOW() - INTERVAL '5 minutes'),

-- Operador 006: Insurgentes Sur
('006', 19.370079, -99.162788, 'device_006_ios', NOW() - INTERVAL '30 minutes'),
('006', 19.370579, -99.163288, 'device_006_ios', NOW() - INTERVAL '15 minutes'),
('006', 19.371079, -99.163788, 'device_006_ios', NOW() - INTERVAL '3 minutes'),

-- Operador 007: Coyoacán
('007', 19.349388, -99.161468, 'device_007_android', NOW() - INTERVAL '35 minutes'),
('007', 19.349888, -99.161968, 'device_007_android', NOW() - INTERVAL '20 minutes'),

-- Operador 008: Tlalpan
('008', 19.290268, -99.165649, 'device_008_ios', NOW() - INTERVAL '40 minutes'),
('008', 19.290768, -99.166149, 'device_008_ios', NOW() - INTERVAL '25 minutes'),
('008', 19.291268, -99.166649, 'device_008_ios', NOW() - INTERVAL '8 minutes'),

-- Operador 009: Xochimilco
('009', 19.269968, -99.103350, 'device_009_android', NOW() - INTERVAL '45 minutes'),
('009', 19.270468, -99.103850, 'device_009_android', NOW() - INTERVAL '30 minutes'),
('009', 19.270968, -99.104350, 'device_009_android', NOW() - INTERVAL '10 minutes'),

-- Operador 010: Interlomas/Huixquilucan  
('010', 19.411899, -99.275589, 'device_010_ios', NOW() - INTERVAL '50 minutes'),
('010', 19.412399, -99.276089, 'device_010_ios', NOW() - INTERVAL '35 minutes'),
('010', 19.412899, -99.276589, 'device_010_ios', NOW() - INTERVAL '15 minutes');

-- Verificar inserción
SELECT 
    operator_number,
    COUNT(*) as total_ubicaciones,
    MAX(captured_at) as ultima_ubicacion,
    MIN(captured_at) as primera_ubicacion
FROM locations 
GROUP BY operator_number 
ORDER BY operator_number;

-- Mostrar la ubicación más reciente de cada operador
SELECT DISTINCT ON (operator_number) 
    operator_number,
    latitude,
    longitude,
    captured_at,
    device_id
FROM locations 
ORDER BY operator_number, captured_at DESC;