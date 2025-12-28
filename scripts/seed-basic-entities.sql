-- Inserta datos de ejemplo para operadores, clientes, camiones y remolques
-- Ejecuta este script en el editor SQL de Supabase o mediante psql

-- Operadores
INSERT INTO operadores (nombre, apellidos, telefono, email, licencia, fecha_vencimiento_licencia, estado)
VALUES
  ('Luis', 'Hernandez', '5551234567', 'luis.hernandez@example.com', 'LIC-OP-001', '2026-05-01', 'activo'),
  ('Carla', 'Ramirez', '5559876543', 'carla.ramirez@example.com', 'LIC-OP-002', '2026-09-15', 'activo');

-- Clientes
INSERT INTO clientes (nombre, empresa, telefono, email, direccion, rfc, estado)
VALUES
  ('Distribuidora Norte', 'Distribuidora Norte SA de CV', '5551112233', 'contacto@distribuidoranorte.com', 'Av. Reforma 123, CDMX', 'DNA010203ABC', 'activo'),
  ('Logistica Express', 'Logistica Express SA de CV', '5554446677', 'ventas@logisticaexpress.com', 'Calz. Ignacio Zaragoza 456, CDMX', 'LEX040506DEF', 'activo');

-- Camiones (tractocamiones)
INSERT INTO camiones (numero_economico, marca, modelo, "año", placas, kilometraje, estado)
VALUES
  ('TRACTO-1001', 'Kenworth', 'T680', 2022, 'ABC123A', 45000, 'disponible'),
  ('TRACTO-1002', 'Freightliner', 'Cascadia', 2021, 'DEF456B', 52000, 'disponible');

-- Remolques
INSERT INTO remolques (numero_economico, tipo, capacidad, placas, estado, ubicacion)
VALUES
  ('REM-2001', 'Seco', 28.50, 'GHI789C', 'disponible', 'Patio Central'),
  ('REM-2002', 'Refrigerado', 26.00, 'JKL012D', 'disponible', 'Bodega Norte');
