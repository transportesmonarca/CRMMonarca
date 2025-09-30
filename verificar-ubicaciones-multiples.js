const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function verificarTablas() {
  console.log('🔍 Verificando tablas de ubicaciones múltiples...');
  
  const tablasUbicaciones = ['embarques_ubicaciones', 'embarques_direcciones', 'ubicaciones_embarque'];
  
  for (const tabla of tablasUbicaciones) {
    try {
      const { data, error } = await supabase.from(tabla).select('*').limit(1);
      
      if (error) {
        if (error.code === 'PGRST116' || error.code === 'PGRST205') {
          console.log('❌', tabla, '- NO EXISTE');
        } else {
          console.log('❓', tabla, '- Error:', error.message);
        }
      } else {
        console.log('✅', tabla, '- EXISTE (', data ? data.length : 0, 'registros muestreados)');
        if (data && data.length > 0) {
          console.log('   Estructura:', Object.keys(data[0]));
        }
      }
    } catch (e) {
      console.log('❌', tabla, '- Excepción:', e.message);
    }
  }
  
  // También verificar estructura de embarques para campos de direcciones
  console.log('\n🔍 Verificando estructura actual de tabla embarques...');
  try {
    const { data, error } = await supabase.from('embarques').select('*').limit(1);
    if (!error && data && data.length > 0) {
      const campos = Object.keys(data[0]);
      const camposDirecciones = campos.filter(c => c.includes('direccion') || c.includes('ubicacion') || c.includes('recolect') || c.includes('entrega'));
      console.log('📍 Campos relacionados con direcciones en embarques:', camposDirecciones);
      
      // Verificar si hay campos JSON/JSONB que podrían tener direcciones múltiples
      const camposJson = campos.filter(c => {
        const valor = data[0][c];
        return typeof valor === 'object' && valor !== null;
      });
      console.log('📋 Campos tipo objeto (posibles JSON):', camposJson);
    }
  } catch (e) {
    console.log('❌ Error verificando embarques:', e.message);
  }
  
  console.log('\n📋 Verificación completada');
}

verificarTablas();