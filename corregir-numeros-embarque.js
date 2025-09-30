const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verificarNumerosEmbarque() {
  console.log('🔍 VERIFICAR: números de embarque nulos');
  console.log('='.repeat(50));

  try {
    // Buscar embarques "listo-para-asignar" con números nulos
    const { data: embarcuesListos } = await supabase
      .from('embarques_nuevo')
      .select('id, numero_embarque, estado, created_at')
      .eq('estado', 'listo-para-asignar');

    console.log(`\n📋 Embarques "listo-para-asignar": ${embarcuesListos?.length || 0}`);
    
    embarcuesListos?.forEach((e, index) => {
      console.log(`\n${index + 1}. ID: ${e.id}`);
      console.log(`   Número: ${e.numero_embarque || 'NULL ❌'}`);
      console.log(`   Estado: ${e.estado}`);
      console.log(`   Creado: ${e.created_at}`);
    });

    // Buscar todos los embarques con número null
    const { data: embarquesNulos } = await supabase
      .from('embarques_nuevo')
      .select('id, numero_embarque, estado, created_at')
      .is('numero_embarque', null);

    console.log(`\n⚠️  Total embarques con numero_embarque NULL: ${embarquesNulos?.length || 0}`);
    
    if (embarquesNulos?.length > 0) {
      const porEstado = embarquesNulos.reduce((acc, e) => {
        acc[e.estado] = (acc[e.estado] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📊 Distribución por estado (números NULL):');
      Object.entries(porEstado).forEach(([estado, count]) => {
        console.log(`   ${estado}: ${count}`);
      });
    }

    // Ahora vamos a corregir estos números
    console.log('\n🔧 Intentando corregir números de embarque...');
    
    for (const embarque of embarcuesListos || []) {
      if (!embarque.numero_embarque) {
        // Generar número basado en la fecha
        const fecha = new Date(embarque.created_at);
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        
        // Buscar el último número del día
        const { data: ultimoDelDia } = await supabase
          .from('embarques_nuevo')
          .select('numero_embarque')
          .like('numero_embarque', `TIM-${año}${mes}${dia}-%`)
          .order('numero_embarque', { ascending: false })
          .limit(1);

        let consecutivo = 1;
        if (ultimoDelDia?.length > 0 && ultimoDelDia[0].numero_embarque) {
          const match = ultimoDelDia[0].numero_embarque.match(/-(\d+)$/);
          if (match) {
            consecutivo = parseInt(match[1]) + 1;
          }
        }

        const nuevoNumero = `TIM-${año}${mes}${dia}-${String(consecutivo).padStart(3, '0')}`;
        
        console.log(`🔄 Corrigiendo ${embarque.id}: ${embarque.numero_embarque} → ${nuevoNumero}`);
        
        const { error } = await supabase
          .from('embarques_nuevo')
          .update({ numero_embarque: nuevoNumero })
          .eq('id', embarque.id);

        if (error) {
          console.log(`   ❌ Error: ${error.message}`);
        } else {
          console.log(`   ✅ Corregido`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

verificarNumerosEmbarque().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
});