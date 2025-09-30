const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function crearEmbarquePrueba() {
  console.log('🧪 CREAR: Embarque de prueba para asignación');
  console.log('='.repeat(60));

  try {
    // Cambiar uno de los embarques "creado" a "listo-para-asignar"
    console.log('1️⃣ Buscando embarque "creado" para cambiar...');
    const { data: embarcuesCreados } = await supabase
      .from('embarques')
      .select('id, folio, estado, cliente_id')
      .eq('estado', 'creado')
      .limit(1);

    if (embarcuesCreados?.length > 0) {
      const embarque = embarcuesCreados[0];
      console.log(`✅ Encontrado: ${embarque.folio} (ID: ${embarque.id})`);
      
      console.log('\n2️⃣ Cambiando estado a "listo-para-asignar"...');
      const { error } = await supabase
        .from('embarques')
        .update({ estado: 'listo-para-asignar' })
        .eq('id', embarque.id);

      if (error) {
        console.log(`❌ Error: ${error.message}`);
      } else {
        console.log(`✅ Estado actualizado`);
        
        // Verificar el cambio
        const { data: verificacion } = await supabase
          .from('embarques')
          .select('folio, estado')
          .eq('id', embarque.id);

        console.log(`📋 Verificación: ${verificacion?.[0]?.folio} - ${verificacion?.[0]?.estado}`);
      }
    } else {
      console.log('❌ No se encontraron embarques en estado "creado"');
      
      // Mostrar estados disponibles
      const { data: todosEstados } = await supabase
        .from('embarques')
        .select('estado, folio')
        .order('fecha_creacion', { ascending: false })
        .limit(10);

      console.log('\n📊 Estados disponibles:');
      const agrupados = todosEstados?.reduce((acc, e) => {
        acc[e.estado] = (acc[e.estado] || 0) + 1;
        return acc;
      }, {}) || {};

      Object.entries(agrupados).forEach(([estado, count]) => {
        console.log(`   ${estado}: ${count}`);
      });
    }

    // Ahora verificar que aparece en la consulta de asignación
    console.log('\n3️⃣ Verificando consulta de asignación...');
    const { data: queryAsignacion } = await supabase
      .from('embarques')
      .select('folio, estado, cliente_id')
      .in('estado', ['listo-para-asignar', 'asignado', 'en-transito', 'cancelado', 'archivado'])
      .order('fecha_creacion', { ascending: false });

    const listosParaAsignar = queryAsignacion?.filter(e => e.estado === 'listo-para-asignar') || [];
    console.log(`📊 Embarques "listo-para-asignar" encontrados: ${listosParaAsignar.length}`);
    
    listosParaAsignar.forEach(e => {
      console.log(`   ✅ ${e.folio}: ${e.estado}`);
    });

    // También verificar tabla normalizada
    console.log('\n4️⃣ Verificando tabla normalizada...');
    const { data: queryNormalizada } = await supabase
      .from('embarques_nuevo')
      .select('folio, estado, cliente_id')
      .in('estado', ['listo-para-asignar', 'asignado', 'en-transito', 'cancelado', 'archivado'])
      .order('created_at', { ascending: false });

    const listosNormalizada = queryNormalizada?.filter(e => e.estado === 'listo-para-asignar') || [];
    console.log(`📊 En tabla normalizada "listo-para-asignar": ${listosNormalizada.length}`);
    
    listosNormalizada.forEach(e => {
      console.log(`   ✅ ${e.folio}: ${e.estado}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

crearEmbarquePrueba().then(() => {
  console.log('\n✅ Prueba de embarque completada');
  process.exit(0);
});