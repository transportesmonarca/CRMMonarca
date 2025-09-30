const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function estadoCompleto() {
  console.log('📊 ESTADO COMPLETO DE EMBARQUES');
  console.log('='.repeat(50));

  try {
    // Estados en tabla normalizada
    const { data: embarquesNuevo } = await supabase
      .from('embarques_nuevo')
      .select('id, numero_embarque, estado, created_at')
      .order('created_at', { ascending: false });

    console.log(`\n📋 Tabla embarques_nuevo: ${embarquesNuevo?.length || 0} registros`);
    
    // Agrupar por estado
    const porEstado = embarquesNuevo?.reduce((acc, e) => {
      acc[e.estado] = (acc[e.estado] || 0) + 1;
      return acc;
    }, {}) || {};

    console.log('\n📈 Distribución por estado:');
    Object.entries(porEstado).forEach(([estado, count]) => {
      console.log(`   ${estado}: ${count}`);
    });

    // Mostrar últimos 10 embarques
    console.log('\n📝 Últimos 10 embarques:');
    const ultimos = embarquesNuevo?.slice(0, 10) || [];
    ultimos.forEach((e, index) => {
      console.log(`${index + 1}. ${e.numero_embarque || 'SIN-NUMERO'} - ${e.estado} (${e.created_at?.substring(0, 16)})`);
    });

    // Verificar si hay algún embarque que debería estar listo para asignar
    console.log('\n🔍 Buscando embarques candidatos para asignación...');
    const candidatos = embarquesNuevo?.filter(e => 
      ['creado', 'pendiente', 'listo-para-asignar'].includes(e.estado)
    ) || [];

    console.log(`\n🎯 Candidatos para asignación: ${candidatos.length}`);
    candidatos.forEach(e => {
      console.log(`   - ${e.numero_embarque || 'SIN-NUMERO'}: ${e.estado} (${e.created_at?.substring(0, 16)})`);
    });

    // Si hay candidatos con estado 'creado', cambiar uno a 'listo-para-asignar'
    const enCreado = candidatos.filter(e => e.estado === 'creado');
    if (enCreado.length > 0) {
      console.log(`\n🔧 Cambiando ${enCreado[0].numero_embarque} a "listo-para-asignar"...`);
      
      const { error } = await supabase
        .from('embarques_nuevo')
        .update({ estado: 'listo-para-asignar' })
        .eq('id', enCreado[0].id);

      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Cambiado a "listo-para-asignar"`);
        
        // Verificar que el cambio se aplicó
        const { data: verificacion } = await supabase
          .from('embarques_nuevo')
          .select('numero_embarque, estado')
          .eq('id', enCreado[0].id);

        console.log(`   📋 Verificación: ${verificacion?.[0]?.numero_embarque} - ${verificacion?.[0]?.estado}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

estadoCompleto().then(() => {
  console.log('\n✅ Estado completo verificado');
  process.exit(0);
});