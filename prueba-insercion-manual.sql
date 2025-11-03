-- ✅ SCRIPT DE PRUEBA CORREGIDO: Insertar contacto con UUID válido

-- 1️⃣ Obtener un cliente existente
SELECT id, nombre FROM clientes LIMIT 1;

-- 2️⃣ Insertar contacto de prueba con UUID válido
-- (Copia el ID del cliente de la consulta anterior y pégalo abajo)

INSERT INTO contactos_clientes (
    id,
    cliente_id,
    nombre,
    telefono,
    email,
    puesto,
    es_principal,
    activo,
    fecha_creacion,
    updated_at
) VALUES (
    gen_random_uuid(),  -- PostgreSQL genera UUID automáticamente
    'PEGA-AQUI-EL-CLIENTE-ID-DE-LA-CONSULTA-ANTERIOR',
    'Contacto de Prueba Manual',
    '+52 555 999 8888',
    'prueba@manual.com',
    'Gerente de Pruebas',
    true,
    true,
    now(),
    now()
);

-- 3️⃣ Verificar que se insertó correctamente
SELECT * FROM contactos_clientes 
WHERE nombre = 'Contacto de Prueba Manual';

-- 4️⃣ Limpiar (opcional)
-- DELETE FROM contactos_clientes WHERE nombre = 'Contacto de Prueba Manual';