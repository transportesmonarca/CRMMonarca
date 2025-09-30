const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspeccionarTablaEstado() {
  try {
    console.log('🔍 Inspeccionando tabla embarques_estado');
    
    // 1. Intentar obtener algunos registros para ver la estructura
    const { data, error } = await supabase
      .from('embarques_estado')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log(`✅ Registros encontrados: ${data?.length || 0}`);
      
      if (data && data.length > 0) {
        console.log('🏗️ Estructura de ejemplo:');
        console.log(JSON.stringify(data[0], null, 2));
        
        console.log('\n🔑 Columnas detectadas:');
        Object.keys(data[0]).forEach(key => {
          console.log(`  - ${key}: ${typeof data[0][key]}`);
        });
      }
    }
    
    // 2. Buscar específicamente por los embarques que nos interesan
    console.log('\n🎯 Buscando estados de embarques específicos:');
    const embarqueIds = [
      '20fa6c23-9294-448b-bfa2-659c87c91da7', // TIM-2509-004
      '508be320-5f66-48d9-8467-189598c4dffd'  // TIM-2509-006
    ];
    
    for (const id of embarqueIds) {
      const { data: estado, error } = await supabase
        .from('embarques_estado')
        .select('*')
        .eq('embarque_id', id);
      
      if (error) {
        console.log(`  ${id}: ❌ Error - ${error.message}`);
      } else {
        console.log(`  ${id}: ${estado?.length || 0} registro(s)`);
        if (estado && estado.length > 0) {
          console.log(`    → ${JSON.stringify(estado[0])}`);
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

inspeccionarTablaEstado();