const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function probarCreacionDirecta() {
  console.log('🧪 PRUEBA: Creación directa en estado listo-para-asignar');
  console.log('='.repeat(65));

  try {
    // Crear embarque directamente usando RPC (similar al modal)
    console.log('1️⃣ Creando embarque usando función SQL actual...');
    
    const folioTest = `DEMO-${Date.now().toString().slice(-4)}`;
    
    const { data: nuevoId, error: errorCrear } = await supabase
      .rpc('crear_embarque_normalizado', {
        p_folio: folioTest,
        p_contenido: 'Embarque demo - flujo modal',
        p_cliente_id: null
      });

    if (errorCrear) {
      console.log('❌ Error creando:', errorCrear.message);
      return;
    }

    console.log(`✅ Embarque creado: ${folioTest} (ID: ${nuevoId})`);

    // Verificar estado inicial
    const { data: embarque } = await supabase
      .from('embarques_nuevo')
      .select('folio, estado, created_at')
      .eq('id', nuevoId)
      .single();

    console.log(`📊 Estado inicial: ${embarque.estado}`);

    if (embarque.estado === 'creado') {
      console.log('\n2️⃣ SIMULANDO: Lo que debería pasar con función corregida...');
      console.log('   Estado inicial sería: "listo-para-asignar"');
      console.log('   Aparecería inmediatamente en sección de Asignación');
      console.log('   Sin necesidad de "Completar y Enviar"');
      
      // Corregir manualmente para demostrar
      await supabase
        .from('embarques_nuevo')
        .update({ estado: 'listo-para-asignar' })
        .eq('id', nuevoId);
      
      console.log('✅ (Corregido manualmente a "listo-para-asignar")');
    }

    // Verificar que aparece en consulta de asignación
    console.log('\n3️⃣ Verificando aparición en asignación...');
    
    const { data: consultaAsignacion } = await supabase
      .from('embarques_nuevo')
      .select('folio, estado')
      .in('estado', ['listo-para-asignar', 'asignado'])
      .order('created_at', { ascending: false })
      .limit(10);

    const encontrado = consultaAsignacion?.find(e => e.folio === folioTest);
    
    if (encontrado) {
      console.log(`✅ ${encontrado.folio} visible en asignación`);
      console.log(`   Estado: ${encontrado.estado}`);
    } else {
      console.log(`❌ ${folioTest} NO encontrado en asignación`);
    }

    console.log('\n4️⃣ SOLUCIÓN REQUERIDA:');
    console.log('   📝 Ejecutar el SQL corregido en Supabase:');
    console.log('       archivo: corregir-estado-creacion-embarques.sql');
    console.log('   🎯 Resultado esperado:');
    console.log('       - Embarques nuevos = estado "listo-para-asignar"');
    console.log('       - Aparecen directo en Asignación');
    console.log('       - Sin globo "modificado"');

    // Limpiar
    await supabase.from('embarques_nuevo').delete().eq('id', nuevoId);
    await supabase.from('embarques_ubicaciones').delete().eq('embarque_id', nuevoId);
    await supabase.from('embarques_financiero').delete().eq('embarque_id', nuevoId);
    await supabase.from('embarques_estado').delete().eq('embarque_id', nuevoId);
    await supabase.from('embarques_documentos').delete().eq('embarque_id', nuevoId);
    await supabase.from('embarques_adicional').delete().eq('embarque_id', nuevoId);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

probarCreacionDirecta().then(() => {
  console.log('\n✅ Prueba completada');
  process.exit(0);
});