-- Script para crear la tabla locations usando operator_number como llave
-- Ejecutar en Supabase SQL Editor

-- 1. Crear la tabla locations si no existe (usando operator_number como llave)
CREATE TABLE IF NOT EXISTS locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operator_number TEXT NOT NULL, -- Llave: número único del operador (OP001, OP002, etc.)
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_locations_operator_number ON locations(operator_number);
CREATE INDEX IF NOT EXISTS idx_locations_captured_at ON locations(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_locations_operator_captured ON locations(operator_number, captured_at DESC);

-- 3. Agregar datos de prueba (opcional)
-- Nota: Reemplaza los UUIDs con IDs reales de operadores de tu base de datos

-- Ejemplo de inserción usando operator_number (descomenta y ajusta los números):
/*
INSERT INTO locations (operator_number, latitude, longitude, captured_at, device_id) VALUES
-- Operador OP001 en Ciudad de México
('OP001', 19.432608, -99.133209, NOW() - INTERVAL '5 minutes', 'device_001'),
-- Operador OP002 en Guadalajara  
('OP002', 20.659699, -103.349609, NOW() - INTERVAL '10 minutes', 'device_002'),
-- Operador OP003 en Monterrey
('OP003', 25.686614, -100.316113, NOW() - INTERVAL '15 minutes', 'device_003');
*/

-- 4. Función para obtener operadores existentes (para ayudar con las pruebas)
SELECT 
    id,
    nombre,
    apellidos,
    operator_number,
    'Para agregar ubicación usa: INSERT INTO locations (operator_number, latitude, longitude) VALUES (''' || operator_number || ''', LAT, LNG);' as comando_ejemplo
FROM operadores 
WHERE estado = 'activo' AND operator_number IS NOT NULL
LIMIT 5;

-- 5. Verificar que la tabla se creó correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'locations' 
ORDER BY ordinal_position;