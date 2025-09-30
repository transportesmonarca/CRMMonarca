const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verificarAmbasTablas() {
  console.log('🔍 VERIFICACIÓN: Ambas tablas de embarques');
  console.log('='.repeat(60));

  try {
    // Tabla legacy
    console.log('\n1️⃣ Tabla legacy (embarques):');
    const { data: embarquesLegacy, error: errorLegacy } = await supabase
      .from('embarques')
      .select('id, numero_embarque, folio, estado, fecha_creacion')
      .order('fecha_creacion', { ascending: false })
      .limit(10);

    if (errorLegacy) {
      console.log(`❌ Error: ${errorLegacy.message}`);
    } else {
      console.log(`✅ Registros: ${embarquesLegacy?.length || 0}`);
      
      if (embarquesLegacy?.length > 0) {
        const porEstado = embarquesLegacy.reduce((acc, e) => {
          acc[e.estado] = (acc[e.estado] || 0) + 1;
          return acc;
        }, {});
        
        console.log('📊 Por estado:');
        Object.entries(porEstado).forEach(([estado, count]) => {
          console.log(`   ${estado}: ${count}`);
        });

        console.log('\n📝 Últimos 5:');
        embarquesLegacy.slice(0, 5).forEach((e, i) => {
          console.log(`   ${i+1}. ${e.numero_embarque || e.folio || 'SIN-NUM'} - ${e.estado}`);
        });

        // Buscar candidatos para cambiar a listo-para-asignar
        const candidatos = embarquesLegacy.filter(e => 
          ['creado', 'pendiente'].includes(e.estado)
        );
        
        console.log(`\n🎯 Candidatos para asignación: ${candidatos.length}`);
        if (candidatos.length > 0) {
          const candidato = candidatos[0];
          console.log(`\n🔧 Cambiando ${candidato.numero_embarque || candidato.folio} a "listo-para-asignar"...`);
          
          const { error } = await supabase
            .from('embarques')
            .update({ estado: 'listo-para-asignar' })
            .eq('id', candidato.id);

          if (error) {
            console.log(`   ❌ Error: ${error.message}`);
          } else {
            console.log(`   ✅ Actualizado`);
          }
        }
      }
    }

    // Tabla normalizada
    console.log('\n2️⃣ Tabla normalizada (embarques_nuevo):');
    const { data: embarquesNuevo, error: errorNuevo } = await supabase
      .from('embarques_nuevo')
      .select('id, numero_embarque, estado, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (errorNuevo) {
      console.log(`❌ Error: ${errorNuevo.message}`);
    } else {
      console.log(`✅ Registros: ${embarquesNuevo?.length || 0}`);
      
      if (embarquesNuevo?.length > 0) {
        console.log('📝 Últimos 5:');
        embarquesNuevo.slice(0, 5).forEach((e, i) => {
          console.log(`   ${i+1}. ${e.numero_embarque || 'SIN-NUM'} - ${e.estado}`);
        });
      } else {
        console.log('⚠️  La tabla normalizada está vacía');
      }
    }

    // Verificar si la función SQL existe
    console.log('\n3️⃣ Verificando función SQL...');
    const { data: funciones, error: errorFunc } = await supabase
      .rpc('crear_embarque_normalizado', {
        p_numero_embarque: 'TEST-12345',
        p_cliente_id: null,
        p_origen_id: null,
        p_destino_id: null,
        p_precio_flete: 1000
      });

    if (errorFunc) {
      console.log(`❌ Función no existe o tiene error: ${errorFunc.message}`);
      console.log('💡 Necesitas ejecutar el SQL de creación de función');
    } else {
      console.log('✅ Función SQL existe y responde');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

verificarAmbasTablas().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
});