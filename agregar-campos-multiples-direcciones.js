const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function agregarCamposMultiplesDirecciones() {
  console.log('🔨 Agregando campos JSON para múltiples direcciones a la tabla embarques...');
  
  // SQL para agregar campos JSON
  const sqlScript = `
    -- Agregar campos JSON para múltiples direcciones
    ALTER TABLE embarques ADD COLUMN IF NOT EXISTS recolectas_json JSONB DEFAULT '[]';
    ALTER TABLE embarques ADD COLUMN IF NOT EXISTS entregas_json JSONB DEFAULT '[]';
    
    -- Crear índices para mejorar las consultas JSON
    CREATE INDEX IF NOT EXISTS idx_embarques_recolectas_json ON embarques USING GIN (recolectas_json);
    CREATE INDEX IF NOT EXISTS idx_embarques_entregas_json ON embarques USING GIN (entregas_json);
    
    -- Agregar comentarios para documentación
    COMMENT ON COLUMN embarques.recolectas_json IS 'Array JSON con múltiples direcciones de recolección: [{"direccion": "...", "fecha": "...", "hora": "..."}]';
    COMMENT ON COLUMN embarques.entregas_json IS 'Array JSON con múltiples direcciones de entrega: [{"direccion": "...", "fecha": "...", "hora": "..."}]';
  `;

  try {
    // Intentar ejecutar usando RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlScript });
    
    if (error) {
      if (error.message.includes('exec_sql')) {
        console.log('⚠️ No se puede ejecutar SQL directamente desde el cliente');
        console.log('📋 EJECUTA MANUALMENTE en tu consola de Supabase:');
        console.log('\\n' + sqlScript);
        return false;
      } else {
        throw error;
      }
    }
    
    console.log('✅ Campos JSON agregados exitosamente');
    return true;
    
  } catch (e) {
    console.error('❌ Error general:', e.message);
    console.log('\\n📋 EJECUTA MANUALMENTE en tu consola de Supabase:');
    console.log('\\n' + sqlScript);
    return false;
  }
}

async function verificarCamposCreados() {
  console.log('\\n🔍 Verificando campos creados...');
  
  try {
    const { data, error } = await supabase.from('embarques').select('*').limit(1);
    if (error) throw error;
    
    if (data && data.length > 0) {
      const campos = Object.keys(data[0]);
      const camposJson = campos.filter(c => c.includes('recolectas_json') || c.includes('entregas_json'));
      
      if (camposJson.length > 0) {
        console.log('✅ Campos JSON encontrados:', camposJson);
        return true;
      } else {
        console.log('❌ Campos JSON no encontrados');
        return false;
      }
    }
  } catch (e) {
    console.error('❌ Error verificando campos:', e.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando configuración de múltiples direcciones...');
  
  // Primero verificar si ya existen
  const yaExisten = await verificarCamposCreados();
  
  if (yaExisten) {
    console.log('✅ Los campos JSON ya existen, no es necesario crearlos');
    return;
  }
  
  // Intentar crearlos
  const creados = await agregarCamposMultiplesDirecciones();
  
  if (creados) {
    // Verificar que se crearon correctamente
    await verificarCamposCreados();
  }
  
  console.log('\\n📋 Proceso completado');
}

main();