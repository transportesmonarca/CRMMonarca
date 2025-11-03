const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createVerificacionesTable() {
  console.log('🔄 Creando tabla verificaciones_camiones...');

  try {
    // Verificar si la tabla ya existe
    console.log('🔍 Verificando si la tabla existe...');
    
    const { data: existingTable } = await supabase
      .from('verificaciones_camiones')
      .select('id')
      .limit(1);

    if (existingTable !== null) {
      console.log('✅ La tabla verificaciones_camiones ya existe');
      return true;
    }

    console.log('❌ La tabla no existe, se debe crear manualmente en Supabase SQL Editor');
    console.log('\n📋 Copia y ejecuta el siguiente SQL en Supabase SQL Editor:');
    
    const sqlScript = `
-- Crear tabla para verificaciones de camiones
CREATE TABLE IF NOT EXISTS verificaciones_camiones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  camion_id UUID NOT NULL REFERENCES camiones(id) ON DELETE CASCADE,
  fecha_verificacion DATE NOT NULL,
  fecha_vencimiento DATE,
  tipo_verificacion VARCHAR(100) NOT NULL DEFAULT 'anual',
  lugar_verificacion VARCHAR(255),
  numero_certificado VARCHAR(100),
  resultado VARCHAR(50) DEFAULT 'aprobada',
  observaciones TEXT,
  recordatorio_enviado BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  creado_por VARCHAR(100) DEFAULT 'Usuario',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_verificaciones_camiones_camion_id ON verificaciones_camiones(camion_id);
CREATE INDEX IF NOT EXISTS idx_verificaciones_camiones_fecha ON verificaciones_camiones(fecha_verificacion);
CREATE INDEX IF NOT EXISTS idx_verificaciones_camiones_fecha_vencimiento ON verificaciones_camiones(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_verificaciones_camiones_tipo ON verificaciones_camiones(tipo_verificacion);
CREATE INDEX IF NOT EXISTS idx_verificaciones_camiones_resultado ON verificaciones_camiones(resultado);
CREATE INDEX IF NOT EXISTS idx_verificaciones_camiones_activo ON verificaciones_camiones(activo);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_verificaciones_camiones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_verificaciones_camiones_updated_at ON verificaciones_camiones;
CREATE TRIGGER update_verificaciones_camiones_updated_at
  BEFORE UPDATE ON verificaciones_camiones
  FOR EACH ROW
  EXECUTE PROCEDURE update_verificaciones_camiones_updated_at();

-- Row Level Security (RLS)
ALTER TABLE verificaciones_camiones ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones
DROP POLICY IF EXISTS "Allow all operations on verificaciones_camiones" ON verificaciones_camiones;
CREATE POLICY "Allow all operations on verificaciones_camiones" ON verificaciones_camiones
  FOR ALL USING (true) WITH CHECK (true);
`;
    
    console.log('\n' + '='.repeat(80));
    console.log(sqlScript);
    console.log('='.repeat(80));
    
    console.log('\n📌 Instrucciones:');
    console.log('1. Ve a tu dashboard de Supabase');
    console.log('2. Navega a SQL Editor');
    console.log('3. Copia y pega el SQL anterior');
    console.log('4. Ejecuta el script');
    console.log('5. Regresa y recarga la página de camiones');

    return false;



  } catch (error) {
    console.error('❌ Error ejecutando script:', error);
    return false;
  }
}

async function testConnection() {
  try {
    console.log('🔄 Probando conexión a Supabase...');
    
    const { data, error } = await supabase
      .from('camiones')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Error de conexión:', error);
      return false;
    }

    console.log('✅ Conexión a Supabase exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error probando conexión:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando configuración de tabla verificaciones_camiones...\n');

  // Probar conexión
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.log('\n❌ No se pudo establecer conexión con Supabase');
    process.exit(1);
  }

  // Crear tabla
  const success = await createVerificacionesTable();
  
  if (success) {
    console.log('\n🎉 ¡Configuración completada exitosamente!');
    console.log('La tabla verificaciones_camiones está lista para usar.');
  } else {
    console.log('\n❌ Hubo errores durante la configuración');
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { createVerificacionesTable, testConnection };