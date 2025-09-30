const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function verificarTabla() {
  console.log('🔍 Verificando existencia de tabla embarque_modificaciones...');
  
  try {
    // Intentar obtener la estructura de la tabla
    const { data, error } = await supabase
      .from('embarque_modificaciones')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error al acceder a la tabla embarque_modificaciones:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      });
      
      // Verificar si es un error de tabla no encontrada
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('🚨 La tabla embarque_modificaciones NO EXISTE en la base de datos');
        console.log('📝 Necesitas crear esta tabla primero para que funcione la funcionalidad de modificaciones');
      }
    } else {
      console.log('✅ Tabla embarque_modificaciones existe y es accesible');
      console.log('📊 Registros encontrados:', data ? data.length : 0);
      if (data && data.length > 0) {
        console.log('🗂️ Estructura del primer registro:');
        console.log('   Columnas:', Object.keys(data[0]));
        console.log('   Primer registro:', data[0]);
      }
    }

    // También intentar listar todas las tablas disponibles
    console.log('\n🔍 Intentando listar tablas relacionadas con embarques...');
    
    // Probar tablas conocidas
    const tablasConocidas = ['embarques', 'embarque_estados', 'embarque_modificaciones'];
    
    for (const tabla of tablasConocidas) {
      try {
        const { data: testData, error: testError } = await supabase
          .from(tabla)
          .select('*')
          .limit(1);
        
        if (testError) {
          console.log(`❌ ${tabla}: ${testError.message}`);
        } else {
          console.log(`✅ ${tabla}: existe (${testData ? testData.length : 0} registros muestreados)`);
        }
      } catch (e) {
        console.log(`❌ ${tabla}: error de conexión - ${e.message}`);
      }
    }
    
  } catch (e) {
    console.error('❌ Excepción general al verificar tabla:', {
      message: e.message,
      stack: e.stack
    });
  }
  
  console.log('\n📋 Verificación completada');
}

verificarTabla();