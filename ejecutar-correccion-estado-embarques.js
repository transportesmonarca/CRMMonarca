const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function ejecutarCorreccionEstadoEmbarques() {
  console.log('🔧 CORRECCIÓN: Estado inicial de embarques');
  console.log('='.repeat(60));

  try {
    // Mostrar función actual antes de cambiarla
    console.log('1️⃣ Verificando función actual...');
    const { data: funcionActual, error: errorFuncion } = await supabase
      .rpc('crear_embarque_normalizado', {
        p_folio: 'TEST-PROBE-001',
        p_cliente_id: null,
        p_contenido: 'Test probe'
      });

    if (errorFuncion) {
      console.log('❌ La función no existe o tiene problemas:', errorFuncion.message);
      console.log('💡 Necesitas ejecutar el SQL en Supabase primero');
      return;
    }

    console.log('✅ Función existe y responde');

    // Limpiar el probe de prueba
    await supabase.from('embarques_nuevo').delete().eq('folio', 'TEST-PROBE-001');

    // 2. Verificar embarques "creado" existentes
    console.log('\n2️⃣ Verificando embarques en estado "creado"...');
    const { data: embarcuesCreados } = await supabase
      .from('embarques_nuevo')
      .select('folio, estado, created_at')
      .eq('estado', 'creado')
      .order('created_at', { ascending: false });

    console.log(`📊 Embarques en estado "creado": ${embarcuesCreados?.length || 0}`);
    if (embarcuesCreados?.length > 0) {
      embarcuesCreados.slice(0, 3).forEach(e => {
        console.log(`   - ${e.folio}: ${e.estado} (${e.created_at?.substring(0, 16)})`);
      });

      // 3. Cambiar embarques recientes a "listo-para-asignar"
      console.log('\n3️⃣ Cambiando embarques recientes a "listo-para-asignar"...');
      const { error: errorUpdate } = await supabase
        .from('embarques_nuevo')
        .update({ 
          estado: 'listo-para-asignar',
          updated_at: new Date().toISOString()
        })
        .eq('estado', 'creado')
        .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString()); // Últimas 24 horas

      if (errorUpdate) {
        console.log('❌ Error actualizando:', errorUpdate.message);
      } else {
        console.log('✅ Embarques actualizados a "listo-para-asignar"');
      }
    }

    // 4. Verificar resultado final
    console.log('\n4️⃣ Verificando resultado final...');
    const { data: estadoFinal } = await supabase
      .from('embarques_nuevo')
      .select('estado, folio')
      .in('estado', ['creado', 'listo-para-asignar'])
      .order('created_at', { ascending: false })
      .limit(10);

    const agrupados = estadoFinal?.reduce((acc, e) => {
      acc[e.estado] = (acc[e.estado] || 0) + 1;
      return acc;
    }, {}) || {};

    console.log('📈 Estado final:');
    Object.entries(agrupados).forEach(([estado, count]) => {
      console.log(`   ${estado}: ${count}`);
    });

    // 5. Probar creación de nuevo embarque con función corregida
    console.log('\n5️⃣ Probando creación de nuevo embarque...');
    const folioTest = `TEST-${Date.now().toString().slice(-6)}`;
    
    const { data: nuevoId, error: errorCrear } = await supabase
      .rpc('crear_embarque_normalizado', {
        p_folio: folioTest,
        p_contenido: 'Embarque de prueba - estado inicial',
        p_cliente_id: null
      });

    if (errorCrear) {
      console.log('❌ Error creando embarque de prueba:', errorCrear.message);
    } else {
      console.log(`✅ Embarque de prueba creado: ID ${nuevoId}`);
      
      // Verificar el estado del embarque recién creado
      const { data: embarqueCreado } = await supabase
        .from('embarques_nuevo')
        .select('folio, estado')
        .eq('id', nuevoId);

      if (embarqueCreado?.length > 0) {
        const e = embarqueCreado[0];
        console.log(`📋 Embarque ${e.folio} tiene estado: ${e.estado}`);
        
        if (e.estado === 'listo-para-asignar') {
          console.log('🎉 ¡ÉXITO! El embarque se creó con estado "listo-para-asignar"');
          console.log('✅ Aparecerá automáticamente en la sección de Asignación');
        } else {
          console.log(`⚠️  Embarque tiene estado "${e.estado}" - necesitas actualizar la función SQL`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

ejecutarCorreccionEstadoEmbarques().then(() => {
  console.log('\n✅ Corrección completada');
  process.exit(0);
});