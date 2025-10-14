-- Script para insertar ubicaciones de prueba usando operator_number
-- Ejecutar DESPUÉS de crear la tabla locations y tener operadores con números asignados

-- PASO 1: Verificar operadores existentes con números
SELECT 
    id, 
    nombre, 
    apellidos, 
    operator_number,
    'INSERT INTO locations (operator_number, latitude, longitude) VALUES (''' || operator_number || ''', LAT, LNG);' as ejemplo_insert
FROM operadores 
WHERE operator_number IS NOT NULL 
ORDER BY operator_number;

-- PASO 2: Insertar ubicaciones de prueba (reemplaza con operator_numbers reales)
-- Descomenta y ajusta los números de operador que existen en tu base de datos:

/*
INSERT INTO locations (operator_number, latitude, longitude, captured_at, device_id) VALUES
-- Operador OP001 - Ciudad de México (Zócalo)
('OP001', 19.432608, -99.133209, NOW() - INTERVAL '3 minutes', 'android_001'),

-- Operador OP002 - Guadalajara (Centro Histórico)  
('OP002', 20.659699, -103.349609, NOW() - INTERVAL '7 minutes', 'android_002'),

-- Operador OP003 - Monterrey (Macroplaza)
('OP003', 25.686614, -100.316113, NOW() - INTERVAL '12 minutes', 'android_003'),

-- Operador OP004 - Puebla (Centro)
('OP004', 19.041297, -98.206291, NOW() - INTERVAL '5 minutes', 'android_004'),

-- Operador OP005 - Tijuana (Zona Centro)
('OP005', 32.515114, -117.038185, NOW() - INTERVAL '8 minutes', 'android_005');
*/

-- PASO 3: Verificar que se insertaron correctamente
SELECT 
    l.operator_number,
    o.nombre,
    o.apellidos, 
    l.latitude,
    l.longitude,
    l.captured_at,
    EXTRACT(EPOCH FROM (NOW() - l.captured_at))/60 as minutos_transcurridos
FROM locations l
LEFT JOIN operadores o ON o.operator_number = l.operator_number
ORDER BY l.captured_at DESC;

-- PASO 4: Comando para probar desde app móvil (ejemplo)
-- Formato para enviar desde Android/iOS:
/*
POST a tu API: /api/ubicacion/actualizar
{
  "operator_number": "OP001",
  "latitude": 19.432608,
  "longitude": -99.133209,
  "device_id": "android_dispositivo_123"
}
*/