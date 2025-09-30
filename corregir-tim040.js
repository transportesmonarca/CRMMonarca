const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config({ path: './env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function corregirTIM040() {
  try {
    console.log('🔧 Corrigiendo TIM-2509-040 en tabla embarques...\n');
    
    // Primero verificar el estado actual
    console.log('📋 Estado actual:');
    const { data: before, error: errorBefore } = await supabase
      .from('embarques')
      .select('folio, estado, estado_facturacion, created_at')
      .eq('folio', 'TIM-2509-040');
      
    if (errorBefore) {
      console.error('❌ Error al consultar estado actual:', errorBefore);
      return;
    }
    
    if (before.length === 0) {
      console.log('⚠️ No se encontró TIM-2509-040 en tabla embarques');
      return;
    }
    
    console.log(`   Folio: ${before[0].folio}`);
    console.log(`   Estado: ${before[0].estado}`);
    console.log(`   Facturación: ${before[0].estado_facturacion || 'NULL'}`);
    console.log(`   Creado: ${before[0].created_at}`);
    
    // Aplicar corrección
    console.log('\n🔧 Aplicando corrección...');
    const { data, error } = await supabase
      .from('embarques')
      .update({
        estado: 'creado',
        estado_facturacion: null
      })
      .eq('folio', 'TIM-2509-040')
      .select();
      
    if (error) {
      console.error('❌ Error al corregir:', error);
      return;
    }
    
    if (data.length === 0) {
      console.log('⚠️ No se actualizó ningún registro');
      return;
    }
    
    console.log('✅ Corrección aplicada exitosamente');
    console.log(`   Estado: "${before[0].estado}" → "creado"`);
    console.log(`   Facturación: "${before[0].estado_facturacion}" → NULL`);
    
    // Verificar el resultado final
    console.log('\n📋 Verificando estado final:');
    const { data: after, error: errorAfter } = await supabase
      .from('embarques')
      .select('folio, estado, estado_facturacion')
      .eq('folio', 'TIM-2509-040');
      
    if (errorAfter) {
      console.error('❌ Error al verificar:', errorAfter);
      return;
    }
    
    console.log(`   Folio: ${after[0].folio}`);
    console.log(`   Estado: ${after[0].estado} ✅`);
    console.log(`   Facturación: ${after[0].estado_facturacion || 'NULL'} ✅`);
    
    console.log('\n💡 El embarque TIM-2509-040 ya no debería aparecer en "Registros Completados"');
    console.log('💡 Ahora debe aparecer correctamente en la sección de embarques creados');
    console.log('💡 Limpia el caché del navegador (localStorage) si sigue apareciendo mal');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

corregirTIM040();