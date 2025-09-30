const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verificarEstadoPersistente() {
  try {
    console.log('🔍 Verificando estado de embarques después de "Completar y Enviar"...');
    
    // Buscar embarques recientes que deberían tener estado 'listo-para-asignar'
    const { data: embarques, error } = await supabase
      .from('embarques')
      .select('id, estado, updated_at, folio, destino')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('\n📊 Estados actuales de embarques recientes:');
    embarques.forEach(embarque => {
      console.log(`ID: ${embarque.id} | Estado: ${embarque.estado} | Folio: ${embarque.folio} | Destino: ${embarque.destino}`);
    });

    // Verificar si hay embarques en estado 'listo-para-asignar'
    const listos = embarques.filter(e => e.estado === 'listo-para-asignar');
    console.log(`\n✅ Embarques en estado 'listo-para-asignar': ${listos.length}`);
    
    // Verificar si hay embarques en estado 'creado'
    const creados = embarques.filter(e => e.estado === 'creado');
    console.log(`📝 Embarques en estado 'creado': ${creados.length}`);

    if (listos.length > 0) {
      console.log('\n🎯 Problema identificado: Los embarques SÍ están en estado "listo-para-asignar" en la DB');
      console.log('   pero el componente React no está reflejando este estado correctamente.');
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

verificarEstadoPersistente();